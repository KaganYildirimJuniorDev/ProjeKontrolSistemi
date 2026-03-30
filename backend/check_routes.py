import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app import create_app

app = create_app()
for rule in app.url_map.iter_rules():
    print(f"{rule.endpoint}: {rule}")
