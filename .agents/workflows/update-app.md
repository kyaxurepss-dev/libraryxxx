---
description: Cómo publicar una nueva actualización de la aplicación
---

Para que las futuras actualizaciones se detecten correctamente, sigue siempre este orden:

### 1. Incrementar la versión
Actualiza el campo `version` en tu `package.json`. Por ejemplo, de `1.1.19` a `1.1.20`.

### 2. Guardar y subir los cambios (Commit & Push)
Asegúrate de que el cambio en `package.json` esté en GitHub antes de crear el tag.
```powershell
git add package.json
git commit -m "chore: bump version to 1.1.20"
git push origin main
```

### 3. Crear y subir el Tag
El tag debe coincidir exactamente con la versión (preferiblemente con una `v` delante, como `v1.1.20`). **Es muy importante que el tag apunte al commit donde ya has actualizado el package.json.**
```powershell
git tag v1.1.20
git push origin v1.1.20
```

### 4. Verificar en GitHub
- Ve a la pestaña **Actions** en tu repositorio.
- Verás que se ha iniciado un nuevo proceso de construcción (build).
- Cuando termine, la release se publicará automáticamente en la sección **Releases**.

### 5. Resultado
Tu aplicación local detectará el nuevo `latest.yml` en GitHub y, al ver que la versión (ej. `1.1.20`) es superior a la actual, descargará e instalará la actualización en segundo plano.
