"""
Mock Moodle data provider for offline testing and development.
"""
from typing import Dict, Any, List

MOCK_USER = {
    "user_id": 42,
    "username": "alex.student",
    "fullname": "Alex Mercer",
    "userpictureurl": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    "site_name": "Antigravity University Moodle Portal",
    "site_url": "https://moodle.university.edu",
    "role": "student"
}

MOCK_COURSES: List[Dict[str, Any]] = [
    {
        "id": 101,
        "shortname": "CS101",
        "fullname": "Introduction to Computer Science & Algorithms",
        "summary": "Foundational course exploring algorithmic thinking, data structures, and computational complexity using modern programming languages.",
        "enrolledusercount": 145,
        "progress": 68.5,
        "completed": False,
        "startdate": 1704067200,
        "enddate": 1717113600
    },
    {
        "id": 102,
        "shortname": "MATH201",
        "fullname": "Discrete Mathematics & Linear Algebra",
        "summary": "Study of discrete mathematical structures including graph theory, combinatorics, matrix transformations, and propositional logic.",
        "enrolledusercount": 98,
        "progress": 85.0,
        "completed": False,
        "startdate": 1704067200,
        "enddate": 1717113600
    },
    {
        "id": 103,
        "shortname": "AI305",
        "fullname": "Machine Learning & Neural Architectures",
        "summary": "Practical and theoretical exploration of supervised and unsupervised learning, gradient descent, transformers, and deep neural networks.",
        "enrolledusercount": 72,
        "progress": 42.0,
        "completed": False,
        "startdate": 1704067200,
        "enddate": 1717113600
    },
    {
        "id": 104,
        "shortname": "CYBER110",
        "fullname": "Cybersecurity & Secure Systems Engineering",
        "summary": "Principles of confidentiality, integrity, and availability, covering threat modeling, network defense, TLS/cryptography, and ethical hacking.",
        "enrolledusercount": 110,
        "progress": 100.0,
        "completed": True,
        "startdate": 1696118400,
        "enddate": 1703980800
    }
]

MOCK_COURSE_CONTENTS: Dict[int, List[Dict[str, Any]]] = {
    101: [
        {
            "id": 1001,
            "name": "Course Information & Syllabus",
            "summary": "Welcome to CS101. Please download the syllabus and join the discussion forum.",
            "modules": [
                {
                    "id": 501,
                    "name": "Official Course Syllabus (PDF)",
                    "modname": "resource",
                    "url": "https://moodle.example.com/mod/resource/view.php?id=501",
                    "description": "Comprehensive course policies and grading breakdown."
                },
                {
                    "id": 502,
                    "name": "General Questions & Announcements",
                    "modname": "forum",
                    "url": "https://moodle.example.com/mod/forum/view.php?id=502",
                    "description": "Instructor announcements and peer Q&A."
                }
            ]
        },
        {
            "id": 1002,
            "name": "Week 1: Algorithmic Thinking & Asymptotics",
            "summary": "Introduction to Big-O notation, time and space complexity.",
            "modules": [
                {
                    "id": 503,
                    "name": "Конспект лекції 1: Складність алгоритмів (PDF)",
                    "modname": "resource",
                    "url": "https://moodle.example.com/mod/resource/view.php?id=503",
                    "description": "Повний конспект лекції з графіками зростання функцій, теоремами та порівняльними таблицями worst-case vs average-case."
                },
                {
                    "id": 506,
                    "name": "Відеозапис лекції 1: Асимптотичний аналіз та Big-O (Video)",
                    "modname": "url",
                    "url": "https://www.youtube.com/watch?v=CS101-Lec1",
                    "description": "Відеозапис першої лекції курсу. Розглядаються верхні та нижні оцінки O(n), розбір прикладів на дошці та типові помилки."
                },
                {
                    "id": 507,
                    "name": "Аудіо-подкаст: Інтуїція алгоритмічної складності (Audio)",
                    "modname": "resource",
                    "url": "https://moodle.example.com/mod/resource/view.php?id=507",
                    "mimetype": "audio/mp3",
                    "description": "Аудіо-розбір для повторення матеріалу в дорозі. Обговорення різниці між O(1), O(log n), O(n) та O(2^n)."
                },
                {
                    "id": 508,
                    "name": "Самоперевірка: Тест на розуміння Big-O (Self-Test)",
                    "quiz_meta": {"name": "Big-O Self-Test", "attempts": 0, "timelimit_seconds": 0, "review_correctness_allowed": True},
                    "modname": "quiz",
                    "url": "https://moodle.example.com/mod/quiz/view.php?id=508",
                    "description": "Формативний тест без ліміту часу. Перевірте, чи правильно ви визначаєте часову складність рекурсивних викликів та циклів."
                },
                {
                    "id": 504,
                    "name": "Лабораторна робота 1: Бінарні дерева пошуку (Assignment)",
                    "modname": "assign",
                    "url": "https://moodle.example.com/mod/assign/view.php?id=504",
                    "description": "Реалізація вставки, видалення та обходу BST з проходженням автоматичних юніт-тестів."
                }
            ]
        },
        {
            "id": 1003,
            "name": "Week 2: Divide and Conquer",
            "summary": "Merge Sort, Quick Sort, and Master Theorem recursion analysis.",
            "modules": [
                {
                    "id": 505,
                    "name": "Quiz 1: Sorting Algorithms",
                    "modname": "quiz",
                    "url": "https://moodle.example.com/mod/quiz/view.php?id=505",
                    "description": "10 multiple choice questions on sorting guarantees."
                }
            ]
        }
    ],
    102: [
        {
            "id": 2001,
            "name": "Linear Algebra Foundations",
            "summary": "Vector spaces, dot products, and orthogonal projections.",
            "modules": [
                {
                    "id": 601,
                    "name": "Homework 1: Vector Spaces & Eigenvalues",
                    "modname": "assign",
                    "url": "https://moodle.example.com/mod/assign/view.php?id=601",
                    "description": "Submit mathematical proofs in PDF format."
                }
            ]
        }
    ]
}

MOCK_ASSIGNMENTS: List[Dict[str, Any]] = [
    {
        "id": 301,
        "cmid": 504,
        "course_id": 101,
        "course_name": "CS101: Intro to Computer Science",
        "name": "Lab 1: Implementing Binary Search Trees",
        "duedate": 1740873600,
        "duedate_formatted": "2026-03-02 23:59:00",
        "intro": "<p>Write a production-ready BST in Python or C++ passing all unit tests.</p>",
        "nosubmissions": 0,
        "submissions_open": True,
        "is_overdue": False
    },
    {
        "id": 302,
        "cmid": 601,
        "course_id": 102,
        "course_name": "MATH201: Discrete Mathematics",
        "name": "Problem Set 3: Graph Coloring & Euler Paths",
        "duedate": 1741478400,
        "duedate_formatted": "2026-03-09 23:59:00",
        "intro": "<p>Prove that every planar graph is 4-colorable or solve the 6 textbook graph proofs.</p>",
        "nosubmissions": 0,
        "submissions_open": True,
        "is_overdue": False
    },
    {
        "id": 303,
        "cmid": 701,
        "course_id": 103,
        "course_name": "AI305: Machine Learning",
        "name": "Project 1: Backpropagation from Scratch",
        "duedate": 1742083200,
        "duedate_formatted": "2026-03-16 23:59:00",
        "intro": "<p>Implement forward pass, cross-entropy loss, and gradient backpropagation with NumPy only.</p>",
        "nosubmissions": 0,
        "submissions_open": True,
        "is_overdue": False
    }
]

MOCK_GRADES: Dict[int, List[Dict[str, Any]]] = {
    101: [
        {
            "id": 1,
            "itemname": "Lab 1: Implementing Binary Search Trees",
            "itemtype": "mod",
            "gradeformatted": "95.00 / 100.00",
            "grademin": 0.0,
            "grademax": 100.0,
            "percentageformatted": "95.0 %",
            "feedback": "Outstanding execution and edge case handling in BST rebalancing."
        },
        {
            "id": 2,
            "itemname": "Quiz 1: Sorting Algorithms",
            "itemtype": "mod",
            "gradeformatted": "10.00 / 10.00",
            "grademin": 0.0,
            "grademax": 10.0,
            "percentageformatted": "100.0 %",
            "feedback": "Perfect score."
        },
        {
            "id": 3,
            "itemname": "Course total",
            "itemtype": "course",
            "gradeformatted": "96.50 %",
            "grademin": 0.0,
            "grademax": 100.0,
            "percentageformatted": "96.5 %",
            "feedback": "Currently on track for an A grade."
        }
    ],
    102: [
        {
            "id": 4,
            "itemname": "Homework 1: Vector Spaces",
            "itemtype": "mod",
            "gradeformatted": "88.00 / 100.00",
            "grademin": 0.0,
            "grademax": 100.0,
            "percentageformatted": "88.0 %",
            "feedback": "Minor error in step 4 of problem 2, otherwise clear mathematical writing."
        },
        {
            "id": 5,
            "itemname": "Course total",
            "itemtype": "course",
            "gradeformatted": "88.00 %",
            "grademin": 0.0,
            "grademax": 100.0,
            "percentageformatted": "88.0 %",
            "feedback": None
        }
    ]
}
