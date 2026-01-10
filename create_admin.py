import os
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model

def create_superuser():
    User = get_user_model()
    username = os.getenv('ADMIN_USERNAME', 'admin')
    email = os.getenv('ADMIN_EMAIL', 'admin@routeguard.com')
    password = os.getenv('ADMIN_PASSWORD', 'Admin123!')

    if not User.objects.filter(username=username).exists():
        print(f"Creating superuser: {username}")
        try:
            User.objects.create_superuser(username, email, password)
            print(f"✅ Superuser '{username}' created successfully!")
        except Exception as e:
            print(f"❌ Failed to create superuser: {e}")
    else:
        print(f"ℹ️ Superuser '{username}' already exists. Skipping creation.")

if __name__ == '__main__':
    create_superuser()
