# El Paraíso — Sistema de gestión

Esta es la aplicación completa (React + Vite + Supabase), lista para publicarse en Netlify.
Funciona igual de bien en computadora que en celular: la pantalla se adapta sola, no
necesitas instalar nada aparte.

No necesitas saber programar para dejarla funcionando. Sigue estos pasos **en orden**.

---

## PARTE 1 · Crear tu base de datos en Supabase

### Paso 1 — Crear el proyecto
1. Entra a [supabase.com](https://supabase.com) y crea una cuenta (o inicia sesión).
2. Crea un **New project**. Ponle el nombre que quieras (ej. "El Paraíso") y una contraseña
   de base de datos (guárdala en un lugar seguro, no la necesitarás para esta app pero
   Supabase te la pide).
3. Espera 1-2 minutos a que el proyecto termine de crearse.

### Paso 2 — Crear tu usuario administrador
1. En el menú de la izquierda, entra a **Authentication → Users**.
2. Presiona **Add user → Create new user**.
3. Escribe el correo y la contraseña con los que vas a ingresar como administrador.
4. Marca la opción **Auto Confirm User** si aparece (así no necesitas confirmar el correo).
5. Presiona **Create user**. Anota el correo exacto que usaste, lo necesitas en el paso siguiente.

### Paso 3 — Permitir que los usuarios inicien sesión sin confirmar correo
Como tú vas a crear los usuarios de tu equipo desde dentro de la app (no desde su propio
correo), es importante desactivar la confirmación obligatoria por email:
1. Ve a **Authentication → Providers → Email** (o **Authentication → Settings**, según la versión).
2. Busca la opción **Confirm email** y desactívala.
3. Guarda los cambios.

### Paso 4 — Crear las tablas (un solo script)
1. En el menú de la izquierda entra a **SQL Editor → New query**.
2. Abre el archivo `sql/schema.sql` que viene dentro de este ZIP, en cualquier editor de texto.
3. Busca la línea que dice:
   ```
   admin_email text := 'admin@elparaiso.com';
   ```
   y reemplaza `admin@elparaiso.com` por el correo exacto que usaste en el Paso 2.
4. Copia **todo** el contenido del archivo y pégalo en el SQL Editor de Supabase.
5. Presiona **Run**. Debería decir "Success" al final. Si ves un mensaje que dice que no
   encontró tu usuario administrador, revisa que el correo esté bien escrito y que hayas
   completado el Paso 2 antes de ejecutar el script.

Con esto, tu base de datos ya tiene todas las tablas, la seguridad activada y tu usuario
convertido en administrador. No necesitas crear ninguna tabla a mano ni tocar el Table Editor.

### Paso 5 — Crear la carpeta de almacenamiento para el logo (bucket)
Esto es opcional, solo lo necesitas si vas a subir el logo del negocio desde Configuración.
1. Ve a **Storage** en el menú de la izquierda.
2. Presiona **New bucket**.
3. Nombre exacto: `business-assets`
4. Actívalo como **Public bucket** (para que el logo se pueda mostrar en los comprobantes y
   en la pantalla de la app).
5. Presiona **Create bucket**.

### Paso 6 — Copiar tus dos datos de conexión
1. Ve a **Project Settings → API** (el ícono de engranaje).
2. Copia el valor de **Project URL**.
3. Copia el valor de **anon public** (también llamado **Publishable key** en versiones nuevas).
   Guarda ambos datos, los vas a pegar en Netlify en la Parte 2.

---

## PARTE 2 · Publicar la aplicación en Netlify

### Paso 1 — Subir el proyecto
Sube la carpeta de este proyecto a un repositorio de GitHub (o arrastra el ZIP directamente
si usas la opción "Deploy manually" de Netlify). Si ya sabes cómo hacerlo, sáltate este paso.

### Paso 2 — Conectar con Netlify
1. Entra a [netlify.com](https://netlify.com) y crea un nuevo sitio desde tu repositorio.
2. Netlify va a detectar automáticamente la configuración gracias al archivo `netlify.toml`
   incluido (comando de build: `npm run build`, carpeta publicada: `dist`). No necesitas
   cambiar nada aquí.

### Paso 3 — Configurar las dos variables de conexión
1. En tu sitio de Netlify, ve a **Site configuration → Environment variables**.
2. Agrega estas dos variables exactamente con estos nombres:
   - `VITE_SUPABASE_URL` → pega aquí el **Project URL** que copiaste en la Parte 1, Paso 6.
   - `VITE_SUPABASE_ANON_KEY` → pega aquí la **anon public key** que copiaste en la Parte 1, Paso 6.
3. Guarda.

### Paso 4 — Publicar
1. Ve a **Deploys** y presiona **Trigger deploy → Deploy site** (o simplemente sube el
   proyecto si es la primera vez, Netlify lo hará solo).
2. Espera a que termine (unos 1-2 minutos).
3. Abre la URL pública que te da Netlify.

---

## PARTE 3 · Primera entrada y checklist de prueba

1. Abre la URL pública de tu sitio.
2. Entra directamente a una ruta interna, por ejemplo agregando `/caja` al final de la URL,
   y refresca la página. No debe verse una pantalla en blanco (esto confirma que las rutas
   funcionan correctamente).
3. Inicia sesión con el correo y contraseña del administrador que creaste en la Parte 1, Paso 2.
4. Deberías ver la matriz de casilleros (algunos ya vienen creados de ejemplo, con códigos
   C-01 a C-10).
5. Ve a **Configuración → Usuarios** y crea un usuario nuevo para tu personal (elige el rol
   "Staff").
6. Cierra sesión y vuelve a entrar con ese usuario nuevo para comprobar que sus permisos
   son correctos (no debería poder ver "Configuración" en el menú).
7. Ve a **Caja** y abre la caja con un monto inicial de prueba.
8. Vuelve a la pantalla principal, presiona "Ocupar" en cualquier casillero, registra una
   venta de prueba y confirma que se descarga el comprobante en PDF.
9. Ve a **Configuración → Negocio** y sube el logo (si creaste el bucket `business-assets`
   en la Parte 1, Paso 5), y completa el nombre, dirección y teléfono del negocio.

Si todo lo anterior funciona, tu sistema está listo para usarse en recepción/caja.

---

## Notas importantes

- **No necesitas tocar nada más en Supabase.** Los nuevos usuarios (staff, otros
  administradores) se crean desde dentro de la app, en Configuración → Usuarios.
- **Los precios y descuentos configurados no alteran ventas pasadas.** Cada venta guarda su
  propio precio y descuento en el momento en que se hizo.
- **"Eliminar" un casillero en realidad lo desactiva.** Esto es intencional: así nunca se
  pierde el historial de ventas asociado a ese casillero.
- Si en algún momento necesitas volver a ejecutar el script `sql/schema.sql` (por ejemplo,
  para asignar el rol admin a otro correo), puedes hacerlo sin problema: todas las
  instrucciones usan `if not exists` / `on conflict`, por lo que no borra ni duplica nada
  que ya exista.
