import html as html_lib
import html.parser
import json
import logging
import re
from urllib.parse import unquote, urlencode, urljoin, urlparse
from typing import Dict, Any, Optional, List, Union
import httpx

from app.config import get_settings
from app.core.parsing_restrictions import get_parsing_restrictions
from app.core.exceptions import (
    MoodleException,
    MoodleAuthError,
    MoodleAPIError,
    MoodleConnectionError,
)
from app.services.mock_data import (
    MOCK_USER,
    MOCK_COURSES,
    MOCK_COURSE_CONTENTS,
    MOCK_ASSIGNMENTS,
    MOCK_GRADES,
)

logger = logging.getLogger("moodle_connector")


def build_moodle_params(params: Dict[str, Any], prefix: str = "") -> List[tuple]:
    """Recursively encode nested dictionaries and lists into PHP-style form parameters."""
    items = []
    for key, value in params.items():
        param_name = f"{prefix}[{key}]" if prefix else str(key)
        if isinstance(value, dict):
            items.extend(build_moodle_params(value, prefix=param_name))
        elif isinstance(value, (list, tuple)):
            for idx, item in enumerate(value):
                if isinstance(item, dict):
                    items.extend(build_moodle_params(item, prefix=f"{param_name}[{idx}]"))
                else:
                    items.append((f"{param_name}[{idx}]", item))
        elif value is not None:
            if isinstance(value, bool):
                items.append((param_name, 1 if value else 0))
            else:
                items.append((param_name, value))
    return items


class _FastDOMNode:
    VOID_TAGS = {"img", "br", "hr", "input", "meta", "link", "area", "base", "col", "embed", "param", "source", "track", "wbr"}

    def __init__(self, tag: str, attrs: list, parent: Optional["_FastDOMNode"] = None):
        self.tag = tag.lower()
        self.attrs = dict(attrs)
        self.classes = set(self.attrs.get("class", "").split())
        self.id = self.attrs.get("id", "")
        self.parent = parent
        self.children: List["_FastDOMNode"] = []
        self.text_parts: List[str] = []

    def get_text(self, exclude_classes: Optional[set] = None) -> str:
        exclude_classes = exclude_classes or set()
        if self.classes.intersection(exclude_classes):
            return ""
        parts = list(self.text_parts)
        for c in self.children:
            txt = c.get_text(exclude_classes)
            if txt:
                parts.append(txt)
        return " ".join("".join(parts).split())

    def find_all(self, tag: Optional[str] = None, class_name: Optional[str] = None) -> List["_FastDOMNode"]:
        res = []
        for c in self.children:
            match = True
            if tag and c.tag != tag.lower():
                match = False
            if class_name and class_name not in c.classes:
                match = False
            if match:
                res.append(c)
            res.extend(c.find_all(tag=tag, class_name=class_name))
        return res

    def find_first(self, tag: Optional[str] = None, class_name: Optional[str] = None) -> Optional["_FastDOMNode"]:
        matches = self.find_all(tag=tag, class_name=class_name)
        return matches[0] if matches else None


class _FastDOMParser(html.parser.HTMLParser):
    def __init__(self):
        super().__init__()
        self.root = _FastDOMNode("root", [])
        self.current = self.root

    def handle_starttag(self, tag: str, attrs: list):
        tag_l = tag.lower()
        node = _FastDOMNode(tag_l, attrs, parent=self.current)
        self.current.children.append(node)
        if tag_l not in _FastDOMNode.VOID_TAGS:
            self.current = node

    def handle_endtag(self, tag: str):
        tag_l = tag.lower()
        cur = self.current
        while cur and cur != self.root:
            if cur.tag == tag_l:
                self.current = cur.parent or self.root
                break
            cur = cur.parent

    def handle_data(self, data: str):
        self.current.text_parts.append(data)


def _get_dom_parents(node: _FastDOMNode, stop_at: Optional[_FastDOMNode] = None) -> List[_FastDOMNode]:
    res = []
    cur = node.parent
    while cur and cur != stop_at:
        res.append(cur)
        cur = cur.parent
    return res


class MoodleClient:
    """
    Asynchronous client for interacting with Moodle LMS.
    Supports:
    1. Browser Cookie Authentication (MoodleSession) - ideal for Google Workspace SSO.
    2. Web Service Security Token Authentication.
    3. Direct Username & Password Authentication.
    """

    def __init__(self, base_url: Optional[str] = None):
        self.settings = get_settings()
        self.base_url = (base_url or self.settings.clean_moodle_url).rstrip("/")
        self.timeout = self.settings.MOODLE_REQUEST_TIMEOUT

    # 1. Cookie Authentication (MoodleSession)
    async def authenticate_with_cookie(
        self,
        cookie_input: str,
        target_moodle_url: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Authenticate an individual user using their active browser MoodleSession cookie.
        Directly extracts the session key (sesskey), user ID, and profile from /my/.
        """
        base_url = (target_moodle_url or self.base_url).rstrip("/")

        # Clean cookie string: strip 'MoodleSession=' or whitespace or quotes
        clean_cookie = cookie_input.strip()
        if "MoodleSession=" in clean_cookie:
            match = re.search(r'MoodleSession=([^;\s"\']+)', clean_cookie)
            if match:
                clean_cookie = match.group(1)
            else:
                clean_cookie = clean_cookie.replace("MoodleSession=", "").strip(" ;\"'")

        # Mock check
        if clean_cookie.startswith("mock_") or self.settings.MOODLE_MOCK_MODE:
            mock_user = MOCK_USER.copy()
            return {
                "token": clean_cookie,
                "auth_type": "cookie",
                "sesskey": "mock_sesskey_12345",
                "user": mock_user,
                "is_mock": True,
            }

        headers = {
            "Cookie": f"MoodleSession={clean_cookie}",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        }

        try:
            async with httpx.AsyncClient(timeout=self.settings.MOODLE_REQUEST_TIMEOUT, follow_redirects=False) as client:
                res = await client.get(f"{base_url}/my/", headers=headers)
        except httpx.RequestError as exc:
            raise MoodleConnectionError(f"Could not connect to Moodle at '{base_url}': {exc}")

        # If redirected to login/index.php, the cookie is invalid or expired
        if res.status_code in (301, 302, 303):
            loc = res.headers.get("location", "")
            if "login" in loc:
                raise MoodleAuthError(
                    "The provided MoodleSession cookie is invalid or has expired. "
                    "Please log into learn.ucu.edu.ua in your browser first and copy the active MoodleSession cookie.",
                    error_code="invalid_cookie"
                )

        if res.status_code != 200:
            raise MoodleAuthError(
                f"Moodle returned HTTP {res.status_code} when validating cookie. Please check the cookie value.",
                error_code="invalid_cookie"
            )

        html = res.text

        # Verify page is not a login page
        if 'name="username"' in html and 'name="password"' in html and 'action="' in html:
            raise MoodleAuthError(
                "Moodle redirected to login page. The MoodleSession cookie is invalid or expired.",
                error_code="invalid_cookie"
            )

        # Extract sesskey
        sesskey_match = re.search(r'"sesskey":"([a-zA-Z0-9]+)"', html)
        if not sesskey_match:
            # Fallback regex for sesskey in HTML
            sesskey_match = re.search(r'sesskey=([a-zA-Z0-9]+)', html)

        sesskey = sesskey_match.group(1) if sesskey_match else ""
        if not sesskey:
            raise MoodleAuthError(
                "Could not extract Moodle sesskey from session. Please ensure you are logged into learn.ucu.edu.ua.",
                error_code="no_sesskey"
            )

        # Extract user ID
        user_id = 0
        uid_match = re.search(r'/user/profile\.php\?id=(\d+)', html) or re.search(r'"userId":\s*(\d+)', html) or re.search(r'"userid":\s*(\d+)', html)
        if uid_match:
            user_id = int(uid_match.group(1))

        # Extract full name
        fullname = "UCU Student"
        name_match = re.search(r'<span class="usertext[^"]*">([^<]+)</span>', html)
        if not name_match:
            name_match = re.search(r'class="userbutton"[^>]*>.*?<span>([^<]+)</span>', html, re.DOTALL)
        if name_match:
            fullname = name_match.group(1).strip()

        # Extract avatar
        avatar_url = None
        avatar_match = re.search(r'<img[^>]+class="[^"]*userpicture[^"]*"[^>]+src="([^"]+)"', html)
        if avatar_match:
            avatar_url = avatar_match.group(1)

        return {
            "token": clean_cookie,
            "auth_type": "cookie",
            "sesskey": sesskey,
            "user": {
                "user_id": user_id,
                "username": fullname.lower().replace(" ", "."),
                "fullname": fullname,
                "userpictureurl": avatar_url,
                "site_name": "UCU Moodle (learn.ucu.edu.ua)",
                "site_url": base_url,
                "role": "student",
            },
            "is_mock": False,
        }

    # 2. Token Authentication
    async def authenticate_with_token(
        self,
        token: str,
        target_moodle_url: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Authenticate using Moodle Web Service Security Key."""
        base_url = (target_moodle_url or self.base_url).rstrip("/")

        if token.startswith("mock_") or self.settings.MOODLE_MOCK_MODE:
            mock_user = MOCK_USER.copy()
            return {
                "token": token,
                "auth_type": "token",
                "sesskey": None,
                "user": mock_user,
                "is_mock": True,
            }

        try:
            site_info = await self.get_site_info(token, base_url=base_url)
        except (MoodleAuthError, MoodleAPIError) as exc:
            raise MoodleAuthError(
                "Invalid or expired Moodle Security Token. Please verify the token.",
                error_code="invalidtoken",
                details=exc.details,
            )

        return {
            "token": token,
            "auth_type": "token",
            "sesskey": None,
            "user": {
                "user_id": site_info.get("userid"),
                "username": site_info.get("username", "student"),
                "fullname": site_info.get("fullname", "Moodle User"),
                "userpictureurl": site_info.get("userpictureurl"),
                "site_name": site_info.get("sitename", "UCU Moodle"),
                "site_url": site_info.get("siteurl", base_url),
                "role": "user",
            },
            "is_mock": False,
        }

    # 3. Username / Password Authentication
    async def authenticate_user(
        self,
        username: str,
        password: str,
        target_moodle_url: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Authenticate with username & password.
        Attempts Moodle's native Web Form login (/login/index.php) first,
        falling back to Mobile Web Services (/login/token.php).
        """
        base_url = (target_moodle_url or self.base_url).rstrip("/")

        if self.settings.MOODLE_MOCK_MODE or username in ("demo", "student", "teacher"):
            mock_user = MOCK_USER.copy()
            mock_user["username"] = username
            mock_user["fullname"] = f"{username.capitalize()} (Demo Student)"
            return {
                "token": f"mock_moodle_token_for_{username}",
                "auth_type": "token",
                "sesskey": None,
                "user": mock_user,
                "is_mock": True,
            }

        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        }

        # --- STEP 1: Attempt Moodle Web Form Login (/login/index.php) ---
        web_error_msg = ""
        try:
            async with httpx.AsyncClient(timeout=self.settings.MOODLE_REQUEST_TIMEOUT, follow_redirects=False, headers=headers) as web_client:
                # 1a. Load login page to obtain initial session cookie and CSRF logintoken
                r_page = await web_client.get(f"{base_url}/login/index.php")
                logintoken_match = re.search(r'name="logintoken" value="([^"]+)"', r_page.text)
                logintoken = logintoken_match.group(1) if logintoken_match else None

                form_data = {
                    "username": username,
                    "password": password,
                    "rememberusername": "1",
                }
                if logintoken:
                    form_data["logintoken"] = logintoken

                # 1b. Submit web login credentials
                r_post = await web_client.post(f"{base_url}/login/index.php", data=form_data)
                
                # Check redirect: Moodle redirects to / or /my/ on success!
                if r_post.status_code in (301, 302, 303):
                    loc = r_post.headers.get("location", "")
                    # If redirect does NOT loop back to login/index.php, it's a successful web login!
                    if "login/index.php" not in loc:
                        # Extract authenticated session cookie
                        moodle_cookie = web_client.cookies.get("MoodleSession") or r_post.cookies.get("MoodleSession")
                        if moodle_cookie:
                            logger.info("Successfully authenticated via Moodle /login/index.php web form!")
                            return await self.authenticate_with_cookie(moodle_cookie, target_moodle_url=base_url)
                    else:
                        # Follow the redirect to inspect the error alert message
                        r_err = await web_client.get(loc)
                        err_match = re.search(r'class="[^"]*alert[^"]*"[^>]*>(.*?)</div>', r_err.text, re.DOTALL)
                        if err_match:
                            clean_err = re.sub(r'<[^>]+>', '', err_match.group(1)).strip()
                            web_error_msg = clean_err
                elif r_post.status_code == 200:
                    err_match = re.search(r'class="[^"]*alert[^"]*"[^>]*>(.*?)</div>', r_post.text, re.DOTALL)
                    if err_match:
                        web_error_msg = re.sub(r'<[^>]+>', '', err_match.group(1)).strip()
        except Exception as exc:
            logger.debug(f"Web form login attempt exception: {exc}")

        # --- STEP 2: Fallback to /login/token.php (Moodle Mobile App Service) ---
        token_endpoint = f"{base_url}/login/token.php"
        data = {
            "username": username,
            "password": password,
            "service": self.settings.MOODLE_SERVICE_SHORTNAME,
        }

        try:
            async with httpx.AsyncClient(timeout=self.settings.MOODLE_REQUEST_TIMEOUT) as client:
                response = await client.post(token_endpoint, data=data)
        except httpx.RequestError as exc:
            raise MoodleConnectionError(f"Could not connect to Moodle auth at '{base_url}': {exc}")

        try:
            res_data = response.json()
        except Exception:
            res_data = {}

        if "token" in res_data:
            token = res_data["token"]
            site_info = await self.get_site_info(token, base_url=base_url)
            return {
                "token": token,
                "auth_type": "token",
                "sesskey": None,
                "user": {
                    "user_id": site_info.get("userid"),
                    "username": site_info.get("username", username),
                    "fullname": site_info.get("fullname", username),
                    "userpictureurl": site_info.get("userpictureurl"),
                    "site_name": site_info.get("sitename", "Moodle LMS"),
                    "site_url": site_info.get("siteurl", base_url),
                    "role": "user",
                },
                "is_mock": False,
            }

        # If both /login/index.php and /login/token.php rejected the credentials:
        raw_token_err = res_data.get("error", "")
        error_msg = web_error_msg or raw_token_err or "Invalid username or password on Moodle."

        # Add helpful guidance for SSO / Google users
        if any(w in error_msg.lower() for w in ["ідентифікацію", "incorrect", "invalid", "failed"]):
            error_msg += (
                "\n\n💡 Tip: If you log in to UCU by clicking 'Sign in with Google', Moodle doesn't store your Google password. "
                "Please use the 'Browser Cookie' tab to connect instantly."
            )

        raise MoodleAuthError(error_msg, error_code="invalidlogin")

    # Core REST Web Service Executor
    async def call_ws(
        self,
        wsfunction: str,
        token: str,
        params: Optional[Dict[str, Any]] = None,
        base_url: Optional[str] = None,
    ) -> Any:
        if token.startswith("mock_") or self.settings.MOODLE_MOCK_MODE:
            return self._handle_mock_call(wsfunction, params or {})

        target_url = (base_url or self.base_url).rstrip("/")
        endpoint = f"{target_url}/webservice/rest/server.php"

        flat_params = [
            ("wstoken", token),
            ("wsfunction", wsfunction),
            ("moodlewsrestformat", "json"),
        ]

        if params:
            flat_params.extend(build_moodle_params(params))

        # Encode body as standard urlencoded bytes to ensure compatibility with httpx AsyncByteStream
        encoded_body = urlencode(flat_params)
        headers = {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        }

        try:
            async with httpx.AsyncClient(timeout=self.settings.MOODLE_REQUEST_TIMEOUT) as client:
                response = await client.post(endpoint, content=encoded_body, headers=headers)
        except httpx.RequestError as exc:
            raise MoodleConnectionError(f"Failed to reach Moodle server: {exc}")

        if response.status_code != 200:
            raise MoodleConnectionError(f"Moodle API returned HTTP {response.status_code}")

        try:
            res_data = response.json()
        except Exception:
            raise MoodleAPIError(f"Invalid JSON returned from Moodle for {wsfunction}: {response.text[:200]}")

        if isinstance(res_data, dict) and ("exception" in res_data or "errorcode" in res_data):
            err_code = res_data.get("errorcode", "api_error")
            err_msg = res_data.get("message", "An error occurred calling Moodle Web Service.")
            if err_code in ("invalidtoken", "accessexception"):
                raise MoodleAuthError(f"Session expired or token invalid: {err_msg}", error_code=err_code)
            raise MoodleAPIError(f"Moodle API Error ({err_code}): {err_msg}", error_code=err_code, details=res_data)

        return res_data

    # AJAX Web Service Executor (for Cookie Sessions)
    async def call_ajax_ws(
        self,
        methodname: str,
        cookie: str,
        sesskey: str,
        args: Optional[Dict[str, Any]] = None,
        base_url: Optional[str] = None,
    ) -> Any:
        if cookie.startswith("mock_") or self.settings.MOODLE_MOCK_MODE:
            return self._handle_mock_call(methodname, args or {})

        target_url = (base_url or self.base_url).rstrip("/")
        endpoint = f"{target_url}/lib/ajax/service.php?sesskey={sesskey}&info={methodname}"

        payload = [
            {
                "index": 0,
                "methodname": methodname,
                "args": args or {},
            }
        ]

        headers = {
            "Cookie": f"MoodleSession={cookie}",
            "Content-Type": "application/json",
            "Accept": "application/json, text/javascript, */*; q=0.01",
            "X-Requested-With": "XMLHttpRequest",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        }

        try:
            async with httpx.AsyncClient(timeout=self.settings.MOODLE_REQUEST_TIMEOUT) as client:
                res = await client.post(endpoint, json=payload, headers=headers)
        except httpx.RequestError as exc:
            raise MoodleConnectionError(f"Error reaching Moodle AJAX endpoint: {exc}")

        try:
            data = res.json()
        except Exception:
            raise MoodleAPIError(f"Invalid JSON from Moodle AJAX: {res.text[:200]}")

        if isinstance(data, list) and len(data) > 0:
            first = data[0]
            if first.get("error"):
                exc = first.get("exception", {})
                raise MoodleAPIError(f"Moodle AJAX Error: {exc.get('message', 'Unknown error')}")
            return first.get("data")

        return data

    # High-level domain services supporting both Token and Cookie

    async def get_site_info(self, token: str, base_url: Optional[str] = None) -> Dict[str, Any]:
        return await self.call_ws("core_webservice_get_site_info", token, base_url=base_url)

    def _format_courses_list(self, raw_courses: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        courses = []
        for c in raw_courses:
            if not isinstance(c, dict) or not c.get("id"):
                continue
            courses.append({
                "id": c["id"],
                "shortname": c.get("shortname", ""),
                "fullname": c.get("fullname", f"Course {c['id']}"),
                "summary": c.get("summary", ""),
                "enrolledusercount": c.get("enrolledusercount"),
                "progress": c.get("progress"),
                "completed": c.get("completed", False),
                "startdate": c.get("startdate"),
                "enddate": c.get("enddate"),
            })
        return courses

    def _enrich_course_sections(
        self,
        raw_sections: List[Dict[str, Any]],
        base_url: str,
        restrictions: Optional[Any] = None,
    ) -> List[Dict[str, Any]]:
        """Validate and enrich raw course sections with files, download URLs, and safety classifications."""
        if restrictions is None:
            restrictions = get_parsing_restrictions()

        clean_sections = []
        for s in raw_sections:
            sec_id = s.get("id", len(clean_sections))
            sec_name = s.get("name", "General")
            sec_summary = s.get("summary")

            modules = []
            for m in s.get("modules", []):
                mod_id = m.get("id", 0)
                mod_name = m.get("name", f"Resource {mod_id}")
                mod_type = m.get("modname", "resource")
                mod_url = m.get("url")

                # Check safety restrictions
                is_safe, reason = restrictions.is_module_safe(mod_name, mod_type, mod_url)
                safety_status = "safe_material" if is_safe else "restricted_exam"

                # Extract files/contents
                contents = m.get("contents", [])
                files_list = []
                download_url = m.get("download_url")

                for f in contents:
                    fname = f.get("filename") or f.get("name") or "document.pdf"
                    furl = f.get("fileurl") or f.get("url")
                    fsize = f.get("filesize")
                    fmime = f.get("mimetype")
                    f_safe, f_reason = restrictions.is_file_safe(fname, furl, fsize)
                    files_list.append({
                        "filename": fname,
                        "fileurl": furl,
                        "filesize": fsize,
                        "mimetype": fmime,
                        "is_safe": f_safe,
                        "safety_reason": f_reason if not f_safe else None,
                    })
                    if not download_url and furl and f_safe:
                        download_url = furl

                if not download_url and mod_type == "resource":
                    download_url = f"{base_url}/mod/resource/view.php?id={mod_id}"

                modules.append({
                    "id": mod_id,
                    "name": mod_name,
                    "modname": mod_type,
                    "instance": m.get("instance", mod_id),
                    "url": mod_url,
                    "description": m.get("description"),
                    "visible": m.get("visible", 1),
                    "contents": contents,
                    "files": files_list,
                    "download_url": download_url,
                    "safety_status": safety_status,
                })

            clean_sections.append({
                "id": sec_id,
                "name": sec_name,
                "summary": sec_summary,
                "modules": modules,
            })

        return clean_sections

    async def get_user_courses(
        self,
        token: str,
        user_id: int,
        auth_type: str = "token",
        sesskey: Optional[str] = None,
        base_url: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Retrieve enrolled courses via REST token, AJAX cookie, or resilient HTML dashboard scraping."""
        target_base = (base_url or self.base_url).rstrip("/")

        # 1. Cookie Authentication (SSO / Web Session)
        if auth_type == "cookie" and sesskey:
            # 1a. Try timeline classifications (inprogress, all, past, future)
            for classification in ("inprogress", "all", "future", "past"):
                try:
                    res = await self.call_ajax_ws(
                        "core_course_get_enrolled_courses_by_timeline_classification",
                        cookie=token,
                        sesskey=sesskey,
                        args={"classification": classification, "limit": 0, "offset": 0, "sort": "fullname"},
                        base_url=target_base,
                    )
                    raw_courses = res.get("courses", []) if isinstance(res, dict) else []
                    if raw_courses:
                        return self._format_courses_list(raw_courses)
                except Exception as e:
                    logger.debug(f"AJAX timeline classification '{classification}' failed: {e}")

            # 1b. Try recent courses
            try:
                recent = await self.call_ajax_ws(
                    "core_course_get_recent_courses",
                    cookie=token,
                    sesskey=sesskey,
                    args={},
                    base_url=target_base,
                )
                if isinstance(recent, list) and recent:
                    return self._format_courses_list(recent)
            except Exception:
                pass

            # 1c. Universal HTML Fallback: scrape user's dashboard (/my/courses.php or /my/ or /)
            try:
                headers = {
                    "Cookie": f"MoodleSession={token}",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                }
                async with httpx.AsyncClient(timeout=self.settings.MOODLE_REQUEST_TIMEOUT, follow_redirects=True, headers=headers) as client:
                    for endpoint in ("/my/courses.php", "/my/", "/"):
                        resp = await client.get(f"{target_base}{endpoint}")
                        if resp.status_code == 200:
                            courses = self.parse_moodle_courses_from_html(resp.text)
                            if courses:
                                return courses
            except Exception as e:
                logger.warning(f"HTML courses scraping fallback failed: {e}")

        # 2. Token Authentication (Web Services)
        if auth_type == "token":
            try:
                raw_courses = await self.call_ws(
                    "core_enrol_get_users_courses",
                    token,
                    params={"userid": user_id},
                    base_url=target_base,
                )
                if isinstance(raw_courses, list) and raw_courses:
                    return self._format_courses_list(raw_courses)
            except Exception as e:
                logger.debug(f"REST core_enrol_get_users_courses failed: {e}")

        # 3. Sandbox / Mock Mode
        if token.startswith("mock_") or self.settings.MOODLE_MOCK_MODE or user_id == 42:
            return MOCK_COURSES

        return []

    def parse_moodle_courses_from_html(self, html: str) -> List[Dict[str, Any]]:
        """Extract enrolled courses from Moodle dashboard HTML (/my/ or /my/courses.php)."""
        courses = []
        seen_ids = set()

        # Find course links: /course/view.php?id=123
        course_link_pattern = re.compile(r'href=["\'][^"\']*\/course\/view\.php\?id=(\d+)[^"\']*["\'][^>]*>(.*?)<\/a>', re.DOTALL | re.IGNORECASE)
        for m in course_link_pattern.finditer(html):
            cid = int(m.group(1))
            if cid in seen_ids or cid <= 1:
                continue

            raw_text = m.group(2)
            # Remove badges / spans
            clean_title = re.sub(r'<[^>]+>', ' ', raw_text).strip()
            clean_title = re.sub(r'\s+', ' ', clean_title).strip()
            if not clean_title or len(clean_title) < 2 or clean_title.lower() in ("home", "dashboard", "courses"):
                continue

            seen_ids.add(cid)
            courses.append({
                "id": cid,
                "shortname": f"COURSE-{cid}",
                "fullname": clean_title,
                "summary": "Imported from Moodle dashboard",
                "enrolledusercount": None,
                "progress": None,
                "completed": False,
                "startdate": None,
                "enddate": None,
            })

        return courses

    def _parse_courseformat_state(self, state_data: Dict[str, Any], base_url: str) -> List[Dict[str, Any]]:
        """Parse Moodle 4+ core_courseformat_get_state structure into standard section dicts."""
        cm_map: Dict[int, Dict[str, Any]] = {}
        cm_list = state_data.get("cm", [])
        if isinstance(cm_list, dict):
            cm_list = list(cm_list.values())

        for cm in cm_list:
            cm_id = cm.get("id")
            if cm_id is not None:
                modname = (cm.get("modname") or "resource").lower()
                url = cm.get("url") or f"{base_url}/mod/{modname}/view.php?id={cm_id}"
                cm_map[int(cm_id)] = {
                    "id": int(cm_id),
                    "name": cm.get("name") or f"Resource {cm_id}",
                    "modname": modname,
                    "instance": cm.get("instance", cm_id),
                    "url": url,
                    "description": cm.get("description"),
                    "visible": cm.get("visible", 1),
                    "contents": [],
                    "download_url": url if modname == "resource" else None,
                    "sectionid": cm.get("sectionid"),
                }

        raw_sections = []
        sections_list = state_data.get("section", [])
        if isinstance(sections_list, dict):
            sections_list = list(sections_list.values())

        for sec in sections_list:
            sec_id = sec.get("id", len(raw_sections))
            sec_num = sec.get("section", len(raw_sections))
            sec_name = sec.get("title") or sec.get("name") or ("General" if sec_num == 0 else f"Section {sec_num}")
            cmlist = sec.get("cmlist", [])
            modules = []
            for cid in cmlist:
                try:
                    cid_int = int(cid)
                    if cid_int in cm_map:
                        modules.append(cm_map[cid_int])
                except (ValueError, TypeError):
                    pass

            if not modules and sec_id:
                for c_item in cm_map.values():
                    if c_item.get("sectionid") == sec_id:
                        modules.append(c_item)

            raw_sections.append({
                "id": sec_num,
                "name": sec_name,
                "summary": sec.get("summary"),
                "modules": modules,
            })
        return raw_sections

    def parse_moodle_course_html(self, html: str, base_url: str = "") -> List[Dict[str, Any]]:
        """
        Robust parser for Moodle course HTML pages (/course/view.php?id=...).
        Extracts sections, summaries, activities/modules, and attached file links.
        Supports Moodle 3.x, 4.x/5.x (Boost, RemUI, Classic, and custom university themes).
        """
        parser = _FastDOMParser()
        parser.feed(html)

        # 1. Identify section containers
        raw_sections: List[_FastDOMNode] = []
        for node in parser.root.find_all():
            is_sec = False
            if "section" in node.classes or "course-section" in node.classes:
                if not any(c in node.classes for c in ("activity", "activity-item", "sectionname", "section-title", "section-handle")):
                    is_sec = True
            elif node.id and re.match(r"^section-\d+$", node.id, re.IGNORECASE):
                is_sec = True
            elif "data-sectionid" in node.attrs or "data-for" in node.attrs and node.attrs["data-for"] == "section":
                is_sec = True

            if is_sec:
                if not any(parent in raw_sections for parent in _get_dom_parents(node)):
                    raw_sections.append(node)

        sections: List[Dict[str, Any]] = []
        sec_counter = 0

        # If no explicit sections found, check if activities exist on the page directly
        if not raw_sections:
            all_page_mods: List[_FastDOMNode] = []
            for node in parser.root.find_all():
                if ("activity" in node.classes or "activity-item" in node.classes) and not any(
                    c in node.classes for c in ("activity-basis", "activity-instance", "activityname", "activity-actions", "activity-dates", "activity-information")
                ):
                    if not any(parent in all_page_mods for parent in _get_dom_parents(node)):
                        all_page_mods.append(node)
            if all_page_mods:
                raw_sections = [parser.root]

        for sec_node in raw_sections:
            sec_id_m = re.search(r"section-(\d+)", sec_node.id) if sec_node.id else None
            if not sec_id_m and "data-sectionid" in sec_node.attrs:
                sec_id_m = re.search(r"(\d+)", sec_node.attrs["data-sectionid"])
            sec_num = int(sec_id_m.group(1)) if sec_id_m else sec_counter
            sec_counter += 1

            # Section title
            title_node = None
            for cand in sec_node.find_all():
                if "sectionname" in cand.classes or "section-title" in cand.classes or "data-sectionname" in cand.attrs or cand.attrs.get("data-for") == "section_title":
                    title_node = cand
                    break
                if cand.tag in ("h3", "h4") and not title_node and not any(c in cand.classes for c in ("activity-title", "activityname")):
                    title_node = cand
            clean_title = title_node.get_text({"accesshide", "sr-only"}) if title_node else ("General" if sec_num == 0 else f"Section {sec_num}")
            if not clean_title.strip():
                clean_title = "General" if sec_num == 0 else f"Section {sec_num}"

            # Section summary
            summary_node = None
            for cand in sec_node.find_all():
                if "summary" in cand.classes or "summarytext" in cand.classes:
                    summary_node = cand
                    break
            clean_summary = summary_node.get_text() if summary_node else None

            # 2. Identify modules inside this section
            raw_mods: List[_FastDOMNode] = []
            for node in sec_node.find_all():
                is_mod = False
                if "activity" in node.classes or "activity-item" in node.classes:
                    if not any(c in node.classes for c in ("activity-basis", "activity-instance", "activityname", "activity-actions", "activity-dates", "activity-information")):
                        is_mod = True
                elif node.id and re.match(r"^module-\d+$", node.id, re.IGNORECASE):
                    is_mod = True

                if is_mod:
                    if not any(parent in raw_mods for parent in _get_dom_parents(node, stop_at=sec_node)):
                        raw_mods.append(node)

            modules: List[Dict[str, Any]] = []
            for m_idx, mod_node in enumerate(raw_mods):
                mod_id = None
                if mod_node.id:
                    m_id_m = re.search(r"module-(\d+)", mod_node.id, re.IGNORECASE)
                    if m_id_m:
                        mod_id = int(m_id_m.group(1))
                if mod_id is None and "data-id" in mod_node.attrs:
                    try:
                        mod_id = int(mod_node.attrs["data-id"])
                    except ValueError:
                        pass

                # Module Type (modname)
                modname = "resource"
                for c in mod_node.classes:
                    if c.startswith("modtype_"):
                        modname = c.replace("modtype_", "").lower()
                        break
                if modname == "resource":
                    for c in mod_node.classes:
                        if c in ("assign", "quiz", "forum", "page", "url", "book", "folder", "label", "choice", "lesson", "feedback", "glossary"):
                            modname = c
                            break

                # Links and files
                all_a = mod_node.find_all(tag="a")
                link_node = None
                file_links = []
                for a in all_a:
                    href = a.attrs.get("href", "").strip()
                    if not href or href.startswith("#") or href.startswith("javascript:"):
                        continue
                    if "pluginfile.php" in href:
                        file_links.append(href)
                    if not link_node:
                        if f"/mod/{modname}/" in href or "aalink" in a.classes or "/mod/" in href:
                            link_node = a

                if not link_node and all_a:
                    for a in all_a:
                        href = a.attrs.get("href", "").strip()
                        if href and not href.startswith("#") and not href.startswith("javascript:"):
                            link_node = a
                            break

                mod_url = link_node.attrs.get("href") if link_node else None

                if mod_id is None and mod_url:
                    url_id_m = re.search(r"[?&]id=(\d+)", mod_url)
                    if url_id_m:
                        mod_id = int(url_id_m.group(1))
                if mod_id is None:
                    mod_id = sec_num * 1000 + m_idx + 1

                if modname == "resource" and mod_url:
                    url_mod_m = re.search(r"/mod/([a-zA-Z0-9_-]+)/", mod_url)
                    if url_mod_m:
                        modname = url_mod_m.group(1).lower()

                # Name
                name_node = None
                for cand in mod_node.find_all():
                    if "instancename" in cand.classes or "activityname" in cand.classes:
                        name_node = cand
                        break
                if name_node:
                    mod_name = name_node.get_text({"accesshide", "sr-only"})
                elif link_node:
                    mod_name = link_node.get_text({"accesshide", "sr-only"})
                else:
                    mod_name = f"Resource {mod_id}"
                mod_name = mod_name.strip() or f"Resource {mod_id}"

                # Description
                desc_node = None
                for cand in mod_node.find_all():
                    if any(c in cand.classes for c in ("contentafterlink", "activity-altcontent", "description")):
                        desc_node = cand
                        break
                mod_desc = desc_node.get_text() if desc_node else None

                # File contents
                contents_list = []
                for flink in file_links:
                    fname = flink.split("/")[-1].split("?")[0]
                    contents_list.append({
                        "type": "file",
                        "filename": fname,
                        "fileurl": flink,
                    })

                download_url = file_links[0] if file_links else (mod_url if modname == "resource" else None)

                modules.append({
                    "id": mod_id,
                    "name": mod_name,
                    "modname": modname,
                    "instance": mod_id,
                    "url": mod_url,
                    "description": mod_desc,
                    "visible": 1,
                    "contents": contents_list,
                    "download_url": download_url,
                })

            sections.append({
                "id": sec_num,
                "name": clean_title,
                "summary": clean_summary,
                "modules": modules,
            })

        return sections

    async def get_course_contents(
        self,
        token: str,
        course_id: int,
        auth_type: str = "token",
        sesskey: Optional[str] = None,
        base_url: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Retrieve course contents / modules with resilient AJAX, REST, and HTML scraping fallback."""
        if token and (token.startswith("mock_") or self.settings.MOODLE_MOCK_MODE):
            return self._handle_mock_call("core_course_get_contents", {"courseid": course_id})

        target_base = (base_url or self.base_url).rstrip("/")
        restrictions = get_parsing_restrictions()
        clean_cookie = token.replace("MoodleSession=", "").strip(" ;\"'") if token else ""

        # 1. Try AJAX if cookie session
        if auth_type == "cookie" and sesskey:
            # 1a. Try Moodle 4+ core_courseformat_get_state (allowed over AJAX in Moodle 4+)
            try:
                res_state = await self.call_ajax_ws(
                    "core_courseformat_get_state",
                    cookie=clean_cookie,
                    sesskey=sesskey,
                    args={"courseid": course_id},
                    base_url=target_base,
                )
                if res_state:
                    state_obj = json.loads(res_state) if isinstance(res_state, str) else res_state
                    if isinstance(state_obj, dict) and (state_obj.get("section") or state_obj.get("cm")):
                        parsed = self._parse_courseformat_state(state_obj, target_base)
                        if parsed and any(len(s.get("modules", [])) > 0 for s in parsed):
                            return self._enrich_course_sections(parsed, target_base, restrictions)
            except Exception as e:
                logger.debug(f"AJAX core_courseformat_get_state failed for course {course_id}: {e}")

            # 1b. Try core_course_get_contents via AJAX
            try:
                res = await self.call_ajax_ws(
                    "core_course_get_contents",
                    cookie=clean_cookie,
                    sesskey=sesskey,
                    args={"courseid": course_id},
                    base_url=target_base,
                )
                if isinstance(res, list) and len(res) > 0:
                    return self._enrich_course_sections(res, target_base, restrictions)
            except Exception as e:
                logger.debug(f"AJAX core_course_get_contents failed for course {course_id}: {e}")


        # 2. Try REST Web Services if token
        if auth_type == "token":
            try:
                raw = await self.call_ws(
                    "core_course_get_contents",
                    token,
                    params={"courseid": course_id},
                    base_url=target_base,
                )
                if isinstance(raw, list) and len(raw) > 0:
                    return self._enrich_course_sections(raw, target_base, restrictions)
            except Exception as e:
                logger.debug(f"REST core_course_get_contents failed for course {course_id}: {e}")

        # 3. Universal HTML Fallback: scrape course page /course/view.php?id={course_id}
        # When WebServices are restricted by university administrators, the student's browser session can ALWAYS
        # fetch the course HTML page with their valid session cookie!
        if auth_type == "cookie" and clean_cookie:
            try:
                scraped = await self._scrape_course_contents_html(cookie=clean_cookie, course_id=course_id)
                if scraped and any(len(s.get("modules", [])) > 0 for s in scraped):
                    return self._enrich_course_sections(scraped, target_base, restrictions)
            except Exception as e:
                logger.debug(f"_scrape_course_contents_html failed for course {course_id}: {e}")

            try:
                course_url = f"{target_base}/course/view.php?id={course_id}"
                headers = {
                    "Cookie": f"MoodleSession={clean_cookie}",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    "Referer": f"{target_base}/my/",
                }
                async with httpx.AsyncClient(timeout=self.settings.MOODLE_REQUEST_TIMEOUT, follow_redirects=True, headers=headers) as client:
                    resp = await client.get(course_url)
                    if resp.status_code == 200 and "login/index.php" not in str(resp.url):
                        parsed_sections = self.parse_moodle_course_html(resp.text, base_url=target_base)
                        if parsed_sections:
                            return self._enrich_course_sections(parsed_sections, target_base, restrictions)
            except Exception as e:
                logger.warning(f"HTML scraping fallback failed for course {course_id}: {e}")

        # 4. Sandbox / Mock Mode
        if token.startswith("mock_") or self.settings.MOODLE_MOCK_MODE:
            mock = self._handle_mock_call("core_course_get_contents", {"courseid": course_id})
            if mock:
                return self._enrich_course_sections(mock, target_base, restrictions)

        return []

    async def pull_all_course_files(
        self,
        token: str,
        course_id: int,
        auth_type: str = "token",
        sesskey: Optional[str] = None,
        base_url: Optional[str] = None,
        target_dir: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Download and pull all accessible, safe files from the course into local storage.
        Enforces parsing restrictions: skips exams, binaries, and oversized files.
        """
        import os
        target_base = (base_url or self.base_url).rstrip("/")
        sections = await self.get_course_contents(
            token=token,
            course_id=course_id,
            auth_type=auth_type,
            sesskey=sesskey,
            base_url=target_base,
        )

        restrictions = get_parsing_restrictions()
        out_dir = target_dir or os.path.join("data", "courses", str(course_id), "files")
        os.makedirs(out_dir, exist_ok=True)

        downloaded_files = []
        skipped_files = []
        total_bytes = 0

        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        }
        if auth_type == "cookie":
            headers["Cookie"] = f"MoodleSession={token}"

        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True, headers=headers) as client:
            for sec in sections:
                sec_name = sec.get("name", "General")
                for mod in sec.get("modules", []):
                    mod_id = mod.get("id")
                    mod_name = mod.get("name", "")
                    mod_type = mod.get("modname", "")

                    # Check module safety
                    m_safe, m_reason = restrictions.is_module_safe(mod_name, mod_type, mod.get("url"))
                    if not m_safe:
                        skipped_files.append({
                            "module_id": mod_id,
                            "module_name": mod_name,
                            "reason": m_reason,
                        })
                        continue

                    # Process attached files or resource URL
                    file_items = mod.get("files", [])
                    if not file_items and mod.get("download_url"):
                        file_items = [{"filename": f"{mod_name}.pdf", "fileurl": mod["download_url"]}]

                    for fitem in file_items:
                        fname = fitem.get("filename") or f"{mod_name}.pdf"
                        furl = fitem.get("fileurl") or mod.get("download_url")
                        if not furl:
                            continue

                        f_safe, f_reason = restrictions.is_file_safe(fname, furl, fitem.get("filesize"))
                        if not f_safe:
                            skipped_files.append({
                                "module_id": mod_id,
                                "module_name": mod_name,
                                "filename": fname,
                                "reason": f_reason,
                            })
                            continue

                        # Check total bytes budget
                        if total_bytes >= restrictions.file_restrictions.max_total_course_pull_bytes:
                            skipped_files.append({
                                "module_id": mod_id,
                                "filename": fname,
                                "reason": "Course file pull quota exceeded",
                            })
                            continue

                        # Download the file
                        try:
                            # Normalize URL
                            fetch_url = furl if furl.startswith("http") else f"{target_base}/{furl.lstrip('/')}"
                            if auth_type == "token" and "wstoken" not in fetch_url:
                                sep = "&" if "?" in fetch_url else "?"
                                fetch_url = f"{fetch_url}{sep}wstoken={token}"

                            resp = await client.get(fetch_url)
                            if resp.status_code == 200 and len(resp.content) > 0:
                                # Save file
                                safe_fname = re.sub(r'[^a-zA-Z0-9_.-]', '_', fname)
                                file_path = os.path.join(out_dir, f"{mod_id}_{safe_fname}")
                                with open(file_path, "wb") as fp:
                                    fp.write(resp.content)

                                f_bytes = len(resp.content)
                                total_bytes += f_bytes
                                downloaded_files.append({
                                    "module_id": mod_id,
                                    "module_name": mod_name,
                                    "section_name": sec_name,
                                    "filename": fname,
                                    "saved_path": file_path,
                                    "size_bytes": f_bytes,
                                })
                        except Exception as e:
                            skipped_files.append({
                                "module_id": mod_id,
                                "filename": fname,
                                "reason": f"Download error: {str(e)}",
                            })

        return {
            "course_id": course_id,
            "total_downloaded": len(downloaded_files),
            "total_skipped": len(skipped_files),
            "total_bytes": total_bytes,
            "downloaded_files": downloaded_files,
            "skipped_files": skipped_files,
            "storage_directory": out_dir,
        }

    @staticmethod
    def _clean_html_text(raw_html: str) -> str:
        cleaned = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", raw_html or "", flags=re.DOTALL | re.IGNORECASE)
        cleaned = re.sub(r"<[^>]+>", " ", cleaned)
        cleaned = html_lib.unescape(cleaned)
        return re.sub(r"\s+", " ", cleaned).strip()

    @staticmethod
    def _is_login_redirect(location: str) -> bool:
        path = (urlparse(location or "").path or "").lower()
        return "/login/" in path or path.endswith("/login")

    @staticmethod
    def _looks_like_login_html(html_str: str) -> bool:
        low = (html_str or "").lower()
        return 'name="logintoken"' in low or ('name="username"' in low and 'type="password"' in low)

    def _is_same_moodle_origin(self, candidate_url: str) -> bool:
        base_parsed = urlparse(self.base_url)
        cand_parsed = urlparse(candidate_url)
        if cand_parsed.netloc.lower() != base_parsed.netloc.lower():
            return False
        if base_parsed.scheme.lower() == "https" and cand_parsed.scheme.lower() != "https":
            return False
        return cand_parsed.scheme.lower() in ("http", "https")

    async def _scrape_course_contents_html(
        self,
        cookie: str,
        course_id: int,
    ) -> List[Dict[str, Any]]:
        """Fallback HTML parser for /course/view.php?id=... when AJAX core_course_get_contents is disabled."""
        current_url = f"{self.base_url}/course/view.php?id={course_id}"
        headers = {
            "Cookie": f"MoodleSession={cookie}",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        }
        res: Optional[httpx.Response] = None
        try:
            async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=False) as client:
                for _ in range(5):
                    if not self._is_same_moodle_origin(current_url):
                        return []
                    res = await client.get(current_url, headers=headers)
                    if res.status_code in (301, 302, 303, 307, 308):
                        loc = res.headers.get("location", "")
                        if not loc:
                            break
                        if self._is_login_redirect(loc):
                            raise MoodleAuthError("MoodleSession cookie expired; please refresh Moodle in Chrome.", error_code="invalid_cookie")
                        current_url = urljoin(current_url, loc)
                        continue
                    break
        except httpx.RequestError as exc:
            raise MoodleConnectionError(f"Failed to fetch Moodle course page: {exc}")

        if res is None or res.status_code != 200 or self._looks_like_login_html(res.text):
            raise MoodleAuthError("MoodleSession cookie is no longer valid for this course.", error_code="invalid_cookie")

        page_html = res.text
        section_blocks = re.split(r'(?=<li[^>]+id="section-\d+")', page_html)
        sections: List[Dict[str, Any]] = []
        mod_re = re.compile(
            r'<a[^>]+href="([^"]*/mod/([a-z0-9_]+)/view\.php\?[^"]*id=(\d+)[^"]*)"[^>]*>(.*?)</a>',
            flags=re.DOTALL | re.IGNORECASE,
        )

        for block in section_blocks:
            sec_id_m = re.search(r'id="section-(\d+)"', block)
            if not sec_id_m:
                continue
            sec_idx = int(sec_id_m.group(1))
            name_m = re.search(r'<h3[^>]*class="[^"]*sectionname[^"]*"[^>]*>(.*?)</h3>', block, flags=re.DOTALL | re.IGNORECASE)
            sec_name = self._clean_html_text(name_m.group(1)) if name_m else f"Section {sec_idx}"
            sum_m = re.search(r'<div[^>]*class="[^"]*summary[^"]*"[^>]*>(.*?)</div>', block, flags=re.DOTALL | re.IGNORECASE)
            sec_summary = self._clean_html_text(sum_m.group(1)) if sum_m else ""

            modules: List[Dict[str, Any]] = []
            seen_cmids = set()
            for href, modname, cmid_str, inner in mod_re.findall(block):
                cmid = int(cmid_str)
                if cmid in seen_cmids:
                    continue
                seen_cmids.add(cmid)
                mod_title = self._clean_html_text(inner) or f"{modname} #{cmid}"
                modules.append({
                    "id": cmid,
                    "name": mod_title,
                    "modname": modname.lower(),
                    "url": html_lib.unescape(href),
                    "description": "",
                    "contents": [],
                })

            if sec_name or modules or sec_summary:
                sections.append({
                    "id": sec_idx,
                    "section": sec_idx,
                    "name": sec_name,
                    "summary": sec_summary,
                    "modules": modules,
                })

        return sections

    async def fetch_module_resource(
        self,
        cookie: str,
        module_url: str,
        modname: str = "resource",
        max_bytes: int = 10 * 1024 * 1024,
        http_client: Optional[httpx.AsyncClient] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Download a safe Moodle module/file using the paired MoodleSession cookie.
        Strictly refuses quiz endpoints (including after redirects), checks HTTPS scheme + host,
        and streams responses to enforce max_bytes before buffering huge files in memory.
        """
        clean_mod = (modname or "resource").lower().strip()
        if clean_mod == "quiz" or "/mod/quiz/" in (module_url or "").lower():
            raise ValueError("Exam Shield: backend fetcher never downloads quiz modules.")

        if not module_url or not cookie:
            return None

        target_url = urljoin(f"{self.base_url}/", module_url)
        if not self._is_same_moodle_origin(target_url) or "/mod/quiz/" in target_url.lower():
            return None

        if "pluginfile.php" not in target_url and clean_mod == "resource" and "redirect=" not in target_url:
            sep = "&" if "?" in target_url else "?"
            target_url = f"{target_url}{sep}redirect=1"

        headers = {
            "Cookie": f"MoodleSession={cookie}",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        }

        async def _perform(client: httpx.AsyncClient) -> Optional[Dict[str, Any]]:
            current_url = target_url
            raw_chunks: List[bytes] = []
            res_status = 0
            res_headers: Dict[str, str] = {}
            resolved_url = current_url

            for _ in range(5):
                if "/mod/quiz/" in current_url.lower():
                    raise ValueError("Exam Shield: redirect targeted restricted quiz module.")
                if not self._is_same_moodle_origin(current_url):
                    return None

                async with client.stream("GET", current_url, headers=headers) as res:
                    res_status = res.status_code
                    res_headers = {k.lower(): v for k, v in res.headers.items()}
                    resolved_url = str(res.url)

                    if "/mod/quiz/" in resolved_url.lower():
                        raise ValueError("Exam Shield: resolved URL is a restricted quiz module.")

                    if res_status in (301, 302, 303, 307, 308):
                        loc = res_headers.get("location", "")
                        if not loc:
                            return None
                        if self._is_login_redirect(loc):
                            raise MoodleAuthError("MoodleSession cookie expired during file download.", error_code="invalid_cookie")
                        current_url = urljoin(current_url, loc)
                        continue

                    if res_status != 200:
                        return None

                    content_len = res_headers.get("content-length")
                    if content_len and content_len.isdigit() and int(content_len) > max_bytes:
                        raise ValueError(f"Resource exceeds max allowed staging limit ({max_bytes // (1024 * 1024)} MB)")

                    total = 0
                    raw_chunks = []
                    async for chunk in res.aiter_bytes(65536):
                        total += len(chunk)
                        if total > max_bytes:
                            raise ValueError(f"Resource exceeds max allowed staging limit ({max_bytes // (1024 * 1024)} MB)")
                        raw_chunks.append(chunk)
                    break

            if res_status != 200:
                return None

            raw_bytes = b"".join(raw_chunks)
            content_type = (res_headers.get("content-type") or "application/octet-stream").split(";")[0].strip().lower()

            if content_type.startswith("text/html"):
                html_str = raw_bytes.decode("utf-8", errors="ignore")
                if self._looks_like_login_html(html_str):
                    raise MoodleAuthError("MoodleSession cookie expired during resource fetch.", error_code="invalid_cookie")

                # Follow nested pluginfile.php resource wrapper link once (keeping quiz/origin guards)
                if clean_mod == "resource":
                    pf_m = re.search(r'(https?://[^"\s<>]+/pluginfile\.php/[^"\s<>]+)', html_str)
                    if not pf_m:
                        pf_rel = re.search(r'(/pluginfile\.php/[^"\s<>]+)', html_str)
                        pf_url = urljoin(f"{self.base_url}/", html_lib.unescape(pf_rel.group(1))) if pf_rel else None
                    else:
                        pf_url = html_lib.unescape(pf_m.group(1))
                    if pf_url and "/mod/quiz/" not in pf_url.lower() and self._is_same_moodle_origin(pf_url):
                        return await self.fetch_module_resource(
                            cookie=cookie,
                            module_url=pf_url,
                            modname="file",
                            max_bytes=max_bytes,
                            http_client=client,
                        )

            filename = ""
            cd = res_headers.get("content-disposition", "")
            cd_m = re.search(r'filename\*?=(?:UTF-8\'\')?"?([^";]+)"?', cd, flags=re.IGNORECASE)
            if cd_m:
                filename = unquote(cd_m.group(1).strip())
            if not filename:
                url_path = urlparse(resolved_url).path
                filename = unquote(url_path.rsplit("/", 1)[-1]) or f"module_{clean_mod}"

            low_fn = filename.lower()
            if content_type == "text/html" and not low_fn.endswith((".html", ".htm")):
                stem = filename[:-4] if low_fn.endswith(".php") else filename
                filename = f"module_{clean_mod}.html" if stem.lower() in ("", "view", "index") else f"{stem}.html"
            elif low_fn.endswith(".php") or "." not in filename:
                mime_ext = {
                    "application/pdf": ".pdf",
                    "text/plain": ".txt",
                    "text/markdown": ".md",
                    "text/csv": ".csv",
                    "application/json": ".json",
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
                    "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
                }.get(content_type)
                if mime_ext:
                    stem = filename[:-4] if low_fn.endswith(".php") else filename
                    filename = f"{stem or f'module_{clean_mod}'}{mime_ext}"

            text_excerpt: Optional[str] = None
            if content_type.startswith("text/html"):
                html_str = raw_bytes.decode("utf-8", errors="ignore")
                main_m = re.search(r'<div[^>]+role="main"[^>]*>(.*?)</section>', html_str, flags=re.DOTALL | re.IGNORECASE)
                text_excerpt = self._clean_html_text(main_m.group(1) if main_m else html_str)

            return {
                "filename": filename,
                "content_type": content_type,
                "raw_bytes": raw_bytes,
                "text_excerpt": text_excerpt,
                "resolved_url": resolved_url,
            }

        try:
            if http_client is not None:
                return await _perform(http_client)
            async with httpx.AsyncClient(
                timeout=max(self.timeout, 30.0),
                follow_redirects=False,
                limits=httpx.Limits(max_connections=10, max_keepalive_connections=8),
            ) as owns_client:
                return await _perform(owns_client)
        except httpx.RequestError as exc:
            raise MoodleConnectionError(f"Failed to download Moodle resource: {exc}")

    async def get_assignments(
        self,
        token: str,
        course_ids: Optional[List[int]] = None,
        auth_type: str = "token",
        sesskey: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Retrieve assignments & due dates."""
        if auth_type == "cookie" and sesskey:
            # Query calendar action events for assignments
            try:
                res = await self.call_ajax_ws(
                    "core_calendar_get_action_events_by_timesort",
                    cookie=token,
                    sesskey=sesskey,
                    args={"timesortfrom": 0, "limitnum": 50},
                )
                events = res.get("events", []) if isinstance(res, dict) else []
                # Transform calendar action events into courses assignments structure
                courses_dict: Dict[int, Dict[str, Any]] = {}
                for ev in events:
                    c_info = ev.get("course", {})
                    c_id = c_info.get("id", 0)
                    c_name = c_info.get("fullname", "Course")
                    if c_id not in courses_dict:
                        courses_dict[c_id] = {"id": c_id, "fullname": c_name, "assignments": []}

                    courses_dict[c_id]["assignments"].append({
                        "id": ev.get("id"),
                        "cmid": ev.get("instance"),
                        "name": ev.get("name"),
                        "duedate": ev.get("timesort"),
                        "intro": ev.get("description"),
                        "nosubmissions": 0,
                        "submissions_open": True,
                    })
                return {"courses": list(courses_dict.values())}
            except Exception as e:
                logger.warning(f"Error fetching assignments via AJAX: {e}")

        params = {}
        if course_ids:
            params["courseids"] = course_ids
        return await self.call_ws("mod_assign_get_assignments", token, params=params)

    async def get_user_grades(
        self,
        token: str,
        course_id: int,
        user_id: int,
        auth_type: str = "token",
        sesskey: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Retrieve user grades."""
        if auth_type == "cookie" and sesskey:
            try:
                res = await self.call_ajax_ws(
                    "gradereport_user_get_grade_items",
                    cookie=token,
                    sesskey=sesskey,
                    args={"courseid": course_id, "userid": user_id},
                )
                if isinstance(res, dict) and "usergrades" in res:
                    return res
            except Exception:
                pass

        return await self.call_ws(
            "gradereport_user_get_grade_items",
            token,
            params={"courseid": course_id, "userid": user_id},
        )

    # Mock dispatcher for development
    def _handle_mock_call(self, wsfunction: str, params: Dict[str, Any]) -> Any:
        if wsfunction in ("core_webservice_get_site_info", "core_course_get_enrolled_courses_by_timeline_classification"):
            if wsfunction == "core_course_get_enrolled_courses_by_timeline_classification":
                return {"courses": MOCK_COURSES, "nextoffset": 0}
            return {
                "sitename": MOCK_USER["site_name"],
                "username": MOCK_USER["username"],
                "firstname": "Alex",
                "lastname": "Mercer",
                "fullname": MOCK_USER["fullname"],
                "userid": MOCK_USER["user_id"],
                "siteurl": MOCK_USER["site_url"],
                "userpictureurl": MOCK_USER["userpictureurl"],
                "functions": [],
            }
        elif wsfunction in ("core_enrol_get_users_courses",):
            return MOCK_COURSES
        elif wsfunction == "core_course_get_contents":
            cid = params.get("courseid", 101)
            return MOCK_COURSE_CONTENTS.get(cid, MOCK_COURSE_CONTENTS[101])
        elif wsfunction in ("mod_assign_get_assignments", "core_calendar_get_action_events_by_timesort"):
            if wsfunction == "core_calendar_get_action_events_by_timesort":
                events = []
                for a in MOCK_ASSIGNMENTS:
                    events.append({
                        "id": a["id"],
                        "name": a["name"],
                        "timesort": a["duedate"],
                        "course": {"id": a["course_id"], "fullname": a["course_name"]},
                        "description": a["intro"],
                        "instance": a["cmid"],
                    })
                return {"events": events}
            return {
                "courses": [
                    {
                        "id": 101,
                        "fullname": "CS101",
                        "assignments": [a for a in MOCK_ASSIGNMENTS if a["course_id"] == 101],
                    },
                    {
                        "id": 102,
                        "fullname": "MATH201",
                        "assignments": [a for a in MOCK_ASSIGNMENTS if a["course_id"] == 102],
                    },
                    {
                        "id": 103,
                        "fullname": "AI305",
                        "assignments": [a for a in MOCK_ASSIGNMENTS if a["course_id"] == 103],
                    },
                ]
            }
        elif wsfunction == "gradereport_user_get_grade_items":
            cid = params.get("courseid", 101)
            items = MOCK_GRADES.get(cid, [])
            return {"usergrades": [{"courseid": cid, "gradeitems": items}]}

        return {}
