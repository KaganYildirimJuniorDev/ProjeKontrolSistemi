import sys
sys.path.insert(0, '.')

from models import Project

# Örnek projeler oluştur
projects_data = [
    ("Web Sitesi Geliştirme", "Responsive HTML/CSS/JavaScript projesi"),
    ("Mobil Uygulama", "Cross-platform Flutter mobile uygulaması"),
    ("AI Chatbot", "Yapay zeka destekli sohbet botu"),
    ("E-Commerce API", "Restful API tasarımı ve implementasyonu"),
    ("Veri Analitik Platform", "Python pandas ve matplotlib ile analiz"),
    ("Sosyal Medya Klonu", "Instagram benzeri sosyal ağ uygulaması"),
    ("Proje Yönetim Aracı", "Agile metodoloji destekli proje yönetimi"),
]

print("Projeler ekleniyor...\n")
for name, desc in projects_data:
    project_id = Project.create(name, desc)
    print(f"[+] '{name}' eklendi (ID: {project_id})")

# Kontrol et
projects = Project.get_all_projects()
print(f"\nToplam {len(projects)} proje eklendi!")
print("\nProje Listesi:")
for i, p in enumerate(projects, 1):
    print(f"{i}. {p['originalName']} - {p['description']}")
