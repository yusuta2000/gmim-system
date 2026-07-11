import psycopg2
from psycopg2.extras import RealDictCursor
import os

# Neon connection string
DATABASE_URL = os.environ.get("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL environment variable is required")

def add_viewer_users():
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor(cursor_factory=RealDictCursor)

    # Get max order
    cur.execute("SELECT MAX(\"order\") as max_order FROM \"ResearchAssistant\"")
    result = cur.fetchone()
    max_order = result['max_order'] if result and result['max_order'] else 0

    # New viewer users
    new_users = [
        {
            "name": "Özcan Arslan",
            "email": "arslano@itu.edu.tr",
            "role": "dekan",
            "password": "dekan2026",
            "faculty": "DZ",
            "department": "GMIM",
            "order": max_order + 1,
        },
        {
            "name": "Burak Zincir",
            "email": "bzincir@itu.edu.tr",
            "role": "baskan",
            "password": "burak2026",
            "faculty": "DZ",
            "department": "GMIM",
            "order": max_order + 2,
        },
    ]

    for user in new_users:
        # Check if already exists
        cur.execute("SELECT id FROM \"ResearchAssistant\" WHERE email = %s", (user["email"],))
        existing = cur.fetchone()
        if existing:
            print(f"  ⚠️  {user['email']} zaten kayıtlı, atlanıyor")
            continue

        cur.execute("""
            INSERT INTO "ResearchAssistant" (id, name, email, phone, faculty, department,
                "totalPoints", "order", "isActive", role, password, "createdAt", "updatedAt")
            VALUES (gen_random_uuid()::text, %s, %s, NULL, %s, %s, 0, %s, true, %s, %s, NOW(), NOW())
        """, (user["name"], user["email"], user["faculty"], user["department"],
              user["order"], user["role"], user["password"]))
        print(f"  ✅ {user['name']} ({user['role']}) eklendi - {user['email']} / {user['password']}")

    conn.commit()

    # List all users
    cur.execute("SELECT name, email, role, \"isActive\" FROM \"ResearchAssistant\" ORDER BY \"order\"")
    all_users = cur.fetchall()
    print(f"\nToplam {len(all_users)} kullanıcı:")
    for u in all_users:
        status = "✅" if u['isActive'] else "🔴"
        print(f"  {status} {u['name']} - {u['email']} - {u['role']}")

    cur.close()
    conn.close()

if __name__ == "__main__":
    print("Dekan ve Bölüm Başkanı kullanıcıları ekleniyor...")
    add_viewer_users()
    print("\nTamamlandı!")
