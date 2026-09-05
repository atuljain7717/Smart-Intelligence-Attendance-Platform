from app.database.database import SessionLocal
from app.models import User, Location, Attendance


db = SessionLocal()

try:
    users = db.query(User).all()
    locations = db.query(Location).all()
    attendance = db.query(Attendance).all()

    print(f"Users: {len(users)}")
    print(f"Locations: {len(locations)}")
    print(f"Attendance records: {len(attendance)}")

    if users:
        print(f"First user: {users[0].name}")

    if locations:
        print(f"First location: {locations[0].name}")

    if attendance:
        print(f"Latest attendance status: {attendance[-1].status}")

    print("✅ SQLAlchemy models connected successfully!")

except Exception as e:
    print("❌ Model test failed!")
    print(e)

finally:
    db.close()