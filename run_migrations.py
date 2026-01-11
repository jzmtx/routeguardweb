import os
import sys
import django
from django.core.management import call_command

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

def run_migrations():
    print("🔄 Starting Database Migrations...")
    try:
        # 1. Make Migrations
        print("1️⃣ Running makemigrations...")
        call_command('makemigrations')
        
        # 2. Migrate
        print("2️⃣ Running migrate...")
        call_command('migrate')
        
        print("✅ Migrations completed successfully!")
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        sys.exit(1)

if __name__ == '__main__':
    run_migrations()
