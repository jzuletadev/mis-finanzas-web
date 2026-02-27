# Cloudflare

## Paso 1: Instalar cloudflared

### Raspberry Pi / ARM64

```bash
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64.deb -o cloudflared.deb
sudo dpkg -i cloudflared.deb
cloudflared --version
```

### VM AMD64 (Google Cloud, VPS, etc.)

```bash
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cloudflared.deb
sudo dpkg -i cloudflared.deb
cloudflared --version
```

## Paso 2: Autenticarse en Cloudflare

```bash
cloudflared tunnel login
```

1. Copia el link que aparece
2. Ábrelo en tu navegador
3. Autoriza tu cuenta y selecciona el dominio

Esto crea: 

* `~/.cloudflared/cert.pem`

## Paso 3: Crear el Tunnel

```bash
cloudflared tunnel create <TUNNEL_NAME>
cloudflared tunnel list
```

Se genera un archivo como:

```
~/.cloudflared/<TUNNEL_ID>.json 
```
Guarda el **TUNNEL_ID**.

## Paso 4: Crear configuración

**cloudflared como servicio SOLO lee `/etc/cloudflared/config.yml`**

```bash
sudo mkdir -p /etc/cloudflared/.cloudflared
sudo cp ~/.cloudflared/* /etc/cloudflared/.cloudflared/

sudo nano /etc/cloudflared/config.yml
```

Contenido correcto:

```yaml
tunnel: <TUNNEL_ID>
credentials-file: /etc/cloudflared/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: subdominio.tudominio.com
    service: http://localhost:<puerto_de_tu_app>
  - service: http_status:404
```

## Paso 5: Crear el DNS automático

```bash
cloudflared tunnel route dns <TUNNEL_NAME> subdominio.tudominio.com
```

Esto crea un **CNAME oculto** en Cloudflare.

## Paso 6: Probar el tunnel manualmente

```bash
cloudflared tunnel run <TUNNEL_NAME>
```

Si no hay errores → continúa.

## Paso 7: Instalar cloudflared como servicio (SYSTEMD)

```bash
sudo cloudflared service install
sudo systemctl daemon-reload
sudo systemctl start cloudflared
sudo systemctl enable cloudflared
```

**Error común**

* No intentes instalar el servicio más de una vez
* Si ya existe: `cloudflared service uninstall`

## Paso 8: Verificar estado del tunnel

```bash
sudo systemctl status cloudflared
sudo journalctl -u cloudflared -f
```

Debes ver:

* `Registered tunnel connection`
* `Connection established`

## Opcional: Detener y deshabilitar el servicio

```bash
sudo systemctl stop cloudflared
sudo systemctl disable cloudflared
```

---

# OPCIÓN 1: Raspberry Pi

### Paso 1: Encontrar la IP de tu Raspberry Pi

```bash
# Desde Mac/Linux o windows con WSL o bonjour instalado
ping -4 raspberrypi.local
```

También puedes ver la IP en tu router (busca "raspberrypi").

### Paso 2: Conectar por SSH

```powershell
ssh pi@192.168.1.XXX
```

### Paso 3: Actualizar el sistema

```bash
sudo apt update && sudo apt upgrade -y
sudo reboot
```

Espera 1 minuto y vuelve a conectar por SSH.

---

# OPCIÓN 2: Google Cloud VM (Capa gratuita)

### Paso 1: Crear la VM

```powershell
gcloud compute instances create mis-finanzas-server \
  --machine-type=e2-micro \
  --zone=us-central1-a \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=30GB \
  --boot-disk-type=pd-standard \
  --tags=http-server,https-server
```

### Paso 2: Configurar Firewall

```powershell
gcloud compute firewall-rules create allow-http \
  --allow=tcp:80 --target-tags=http-server

gcloud compute firewall-rules create allow-https \
  --allow=tcp:443 --target-tags=https-server
```

### Paso 3: Conectar a la VM

```powershell
gcloud compute ssh mis-finanzas-server --zone=us-central1-a
```

### Paso 4: Actualizar el sistema

```bash
sudo apt update && sudo apt upgrade -y
sudo timedatectl set-timezone America/Guatemala
```

---

# ANEXO A: Instalación de Docker

### Paso 1: Instalar Docker

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Usar Docker sin sudo
sudo usermod -aG docker $USER

# Cerrar sesión para aplicar cambios
exit
```

**Vuelve a conectar** por SSH y continúa:

### Paso 2: Verificar Docker

```bash
# Habilitar Docker al inicio
sudo systemctl enable docker

# Verificar estado
sudo systemctl status docker
```

### Paso 4: (Opcional) Iniciar sesion en la Raspberry Pi o VM


```bash
# Iniciar sesión en Docker para poder hacer pull de las imágenes privadas
docker login -u tu_usuario -p tu_contraseña
```

---

# ANEXO B: Despliegue de mysql con Docker + Backend en la misma red

### Paso 1: Crear una red personalizada

```bash
docker network create mis_finanzas_network
```

### Paso 2: Desplegar MySQL

```bash
docker run -d \
  --name mysql \
  --restart=always \
  --network mis_finanzas_network \
  -e MYSQL_ROOT_PASSWORD=secure_pass \
  -e MYSQL_DATABASE=mis_finanzas_db \
  -p 3306:3306 \
  -v mysql_data:/var/lib/mysql \
  mysql:8.0
```

### Paso 2: Verificar que MySQL esté corriendo

```bash
docker ps
```

### Paso 3: Conectar a MySQL

```bash
docker exec -it mysql mysql -u root -p
```

### Paso 4: Desplegar el backend en la misma red

```bash
docker run -d \
  --name mf-backend \
  --restart=always \
  --network mis_finanzas_network \
  -e DB_HOST=mysql \
  -e DB_USER=root \
  -e DB_PASSWORD=secure_pass \
  -e DB_NAME=mis_finanzas_db \
  -e DB_PORT=3306 \
  -e FRONTEND_URL=http://localhost:5173 \
  -p 8080:8080 \
  jzuletadev/mf-backend:arm64
```

### Paso 5: Verificar que ambos contenedores estén corriendo

```bash
docker ps
```

### Paso 6: Probar la conexión entre el backend y MySQL

```bash
docker logs mf-backend
```

Si el backend se conecta correctamente a MySQL, deberías ver logs sin errores relacionados a la base de datos.

### Paso 7: Probar el backend
```bash
curl http://localhost:8080/auth/validate
```

Si todo está funcionando, deberías recibir una respuesta indicando que el backend está saludable.

### Paso 8: Desplegar el frontend en la misma red

La imagen ya fue construida con `VITE_API_BASE_URL=/api` (valor baked en build time). Nginx escucha en el puerto 80 y hace proxy de todas las peticiones `/api/*` hacia `http://mf-backend:8080`, resolviendo `mf-backend` por nombre de contenedor dentro de la red Docker. Por eso **es obligatorio** que ambos contenedores estén en `mis_finanzas_network`.

> **No** es neceario pasa `-e VITE_API_BASE_URL=...` en tiempo de ejecución — es una variable de Vite que se resuelve en build time y no tiene efecto en runtime.

```bash
docker run -d \
  --name mf-frontend \
  --restart=always \
  --network mis_finanzas_network \
  -p 80:80 \
  jzuletadev/mf-frontend:arm64
```

### Paso 9: Verificar que el frontend esté corriendo

```bash
docker ps
```

Deberías ver `mf-frontend`, `mf-backend` y `mysql` en la lista.

### Paso 10: Probar el frontend
```bash
curl http://localhost
```

Si el frontend se despliega correctamente, deberías ver el HTML de tu aplicación.

### Paso 11: Probar el proxy nginx → backend

```bash
# Nginx debe redirigir /api/auth/validate → mf-backend:8080/auth/validate
curl http://localhost/api/auth/validate
```


