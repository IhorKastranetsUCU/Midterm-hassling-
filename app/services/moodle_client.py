import html as html_lib
import logging
import re
from urllib.parse import unquote, urlencode, urljoin, urlparse
from typing import Dict, Any, Optional, List, Union
import httpx

from app.config import get_settings
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

    async def get_user_courses(
        self,
        token: str,
        user_id: int,
        auth_type: str = "token",
        sesskey: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Retrieve enrolled courses via REST token or AJAX cookie."""
        if auth_type == "cookie" and sesskey:
            res = await self.call_ajax_ws(
                "core_course_get_enrolled_courses_by_timeline_classification",
                cookie=token,
                sesskey=sesskey,
                args={"classification": "all", "limit": 0, "offset": 0, "sort": "fullname"},
            )
            raw_courses = res.get("courses", []) if isinstance(res, dict) else []
            courses = []
            for c in raw_courses:
                courses.append({
                    "id": c.get("id"),
                    "shortname": c.get("shortname", ""),
                    "fullname": c.get("fullname", ""),
                    "summary": c.get("summary", ""),
                    "enrolledusercount": c.get("enrolledusercount"),
                    "progress": c.get("progress"),
                    "completed": c.get("completed", False),
                    "startdate": c.get("startdate"),
                    "enddate": c.get("enddate"),
                })
            return courses

        return await self.call_ws("core_enrol_get_users_courses", token, params={"userid": user_id})

    async def get_course_contents(
        self,
        token: str,
        course_id: int,
        auth_type: str = "token",
        sesskey: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Retrieve course contents / modules (AJAX first, HTML scrape fallback for cookie sessions)."""
        if auth_type == "cookie":
            if token.startswith("mock_") or self.settings.MOODLE_MOCK_MODE:
                return self._handle_mock_call("core_course_get_contents", {"courseid": course_id})
            if sesskey:
                try:
                    res = await self.call_ajax_ws(
                        "core_course_get_contents",
                        cookie=token,
                        sesskey=sesskey,
                        args={"courseid": course_id},
                    )
                    if isinstance(res, list):
                        return res
                except Exception:
                    pass
            return await self._scrape_course_contents_html(cookie=token, course_id=course_id)

        return await self.call_ws("core_course_get_contents", token, params={"courseid": course_id})

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
