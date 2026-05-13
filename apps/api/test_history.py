import json
import sys
from datetime import datetime

import requests
from sqlalchemy import create_engine, text

# We will need the auth token again. You should grab the current admin token from a previous run or authenticate.
URL = "http://127.0.0.1:8000/api/v1/auth/login"
data = {"username": "admin@school.dev", "password": "change_this_password"}
response = requests.post(URL, data=data)
if response.status_code != 200:
    print("Login failed", response.text)
    sys.exit(1)

# Get a Task UUID
engine = create_engine("postgresql://learnhouse:learnhouse@localhost:5432/learnhouse")
with engine.connect() as conn:
    res = conn.execute(
        text(
            "SELECT id, assignment_task_uuid, assignment_id, assignment_type FROM assignmenttask WHERE assignment_type='CODE_EDITOR' LIMIT 1"
        )
    ).first()
    if not res:
        print("No CODE_EDITOR tasks found")
        sys.exit(1)

    task_id = res[0]
    task_uuid = res[1]
    assign_id = res[2]
    task_type = res[3]

    # Get Assignment info
    res2 = conn.execute(
        text(
            f"SELECT activity_id, course_id, chapter_id FROM assignment WHERE id={assign_id}"
        )
    ).first()
    activity_id = res2[0]
    course_id = res2[1]
    chapter_id = res2[2]

    # Get Admin User ID
    res3 = conn.execute(
        text("SELECT id FROM \"user\" WHERE email='admin@school.dev'")
    ).first()
    user_id = res3[0]

print(f"Targeting Task: {task_uuid} for User: {user_id}")

with engine.begin() as conn:
    # Check if submission exists
    sub = conn.execute(
        text(
            f"SELECT id, task_submission FROM assignmenttasksubmission WHERE user_id={user_id} AND assignment_task_id={task_id}"
        )
    ).first()

    if sub:
        existing_json = sub[1]

        # Append history manually as backend would
        existing_history = existing_json.get("history", [])
        existing_history.append(
            {
                "timestamp": str(datetime.now()),
                "submissions": [
                    {
                        "exerciseUUID": "ex_1",
                        "code": f"print('Attempt {len(existing_history) + 1}')",
                    }
                ],
            }
        )
        existing_json["history"] = existing_history

        conn.execute(
            text(
                "UPDATE assignmenttasksubmission SET task_submission = :ts WHERE id = :id"
            ),
            {"ts": json.dumps(existing_json), "id": sub[0]},
        )
        print(f"Updated existing submission. History length: {len(existing_history)}")
    else:
        new_json = {
            "submissions": [{"exerciseUUID": "ex_1", "code": "print('Attempt 1')"}],
            "history": [
                {
                    "timestamp": str(datetime.now()),
                    "submissions": [
                        {"exerciseUUID": "ex_1", "code": "print('Attempt 1')"}
                    ],
                }
            ],
        }
        conn.execute(
            text(f"""
            INSERT INTO assignmenttasksubmission
            (assignment_task_submission_uuid, task_submission, grade, task_submission_grade_feedback, assignment_type, user_id, activity_id, course_id, chapter_id, assignment_task_id, creation_date, update_date)
            VALUES
            ('test_hist_uuid', :ts, 0, '', '{task_type}', {user_id}, {activity_id}, {course_id}, {chapter_id}, {task_id}, '{datetime.now()}', '{datetime.now()}')
        """),
            {"ts": json.dumps(new_json)},
        )
        print("Inserted new submission with history length: 1")

print("✅ DB Update Successful!")
