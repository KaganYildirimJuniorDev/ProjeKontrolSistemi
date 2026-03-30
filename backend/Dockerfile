# Python 3.9 tabanlı bir imaj kullanıyoruz
FROM python:3.9

# Çalışma dizinini /app yapıyoruz
WORKDIR /app

# Gerekli dosyaları kopyalıyoruz
COPY requirements.txt .

# Kütüphaneleri yüklüyoruz
RUN pip install --no-cache-dir -r requirements.txt

# Tüm backend dosyalarını kopyalıyoruz
COPY . .

# Flask'ın çalışacağı portu belirtiyoruz. 
# Hugging Face Spaces varsayılan olarak 7860 portunu bekler.
EXPOSE 7860

# Uygulamayı gunicorn ile başlatıyoruz
# 0.0.0.0 üzerinden 7860 portuna gunicorn ile bağlıyoruz.
CMD ["gunicorn", "--bind", "0.0.0.0:7860", "app:app"]
