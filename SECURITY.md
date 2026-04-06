# PROTOCOLO DE CIBERSEGURIDAD "ZERO TRUST" PARA DESARROLLO Y AGENTES IA

**DIRECTRIZ SUPREMA DE SEGURIDAD (ZERO TRUST)**
Como agente de IA operando en este entorno, este protocolo rige con carácter de regla inflexible. Cualquier desviación de este protocolo debe ser notificada y requiere autorización humana explícita.

## 1. Prevención de Infiltración en la Cadena de Suministro (Librerías y Paquetes)

- **Prohibición de Typosquatting:** Antes de ejecutar `npm install`, `yarn add` o `pip install`, se debe verificar meticulosamente el nombre exacto del paquete. No instalar paquetes con nombres similares a librerías populares.
- **Auditoría Obligatoria:** Inmediatamente después de instalar cualquier dependencia nueva, se debe ejecutar `npm audit` o el equivalente del gestor de paquetes. Si se detectan vulnerabilidades de nivel "Alto" o "Crítico", se debe revertir la instalación y proponer una alternativa segura o una versión parchada.
- **Fijación de Versiones (Pinning):** Nunca instalar dependencias con el prefijo `^` o `~` (ej. `^1.2.3`) en el archivo final de producción. Se debe fijar la versión exacta para evitar que dependencias secundarias inyecten código malicioso en futuras compilaciones automáticas.
- **Bloqueo de Scripts Automáticos:** Al instalar paquetes críticos o desconocidos, utilizar la bandera `--ignore-scripts` para evitar que códigos maliciosos se ejecuten automáticamente en la terminal durante el proceso de instalación.

## 2. Prevención de Man-in-the-Middle (MitM) y Redes Comprometidas

- **Forzar Encriptación (TLS/SSL):** Todas las conexiones a bases de datos (PostgreSQL/Supabase), repositorios (GitHub) o APIs externas deben forzar el protocolo `https://` o `wss://`. Las conexiones por `http://` están estrictamente prohibidas y deben ser bloqueadas a nivel de código.
- **Integridad de Subrecursos (SRI):** Si se genera código HTML que importa scripts externos (CDNs), es obligatorio incluir el atributo `integrity` con el hash criptográfico (SHA-384) para garantizar que el archivo no fue alterado en tránsito.
- **Autenticación de Repositorios:** Para interactuar con GitHub, asumir el uso exclusivo de claves SSH (preferentemente Ed25519). Nunca exponer tokens de acceso personal (PATs) en logs de consola o archivos de texto plano.

## 3. Prevención de Túneles Inversos y Exposición de Puertos

- **Bloqueo de Exposición Local:** Está estrictamente prohibido descargar, instalar o inicializar herramientas de tunneling local (como ngrok, localtunnel, serveo o similares) a menos que el usuario lo solicite explícitamente con la palabra clave "AUTORIZO TÚNEL".
- **Binding de Puertos Restringido:** Cuando se levanten servidores de desarrollo (ej. Next.js, Express), hacerlo vinculándolos exclusivamente a `localhost` o `127.0.0.1`. Nunca vincularlos a `0.0.0.0` a menos que se esté configurando un contenedor Docker aislado, ya que esto expone el puerto a toda la red local.

## 4. Gestión de Secretos (Credentials Management)

- **Cero Secretos Hardcodeados:** Nunca escribir claves de API de Supabase, URLs de bases de datos o JWT secrets directamente en el código fuente.
- **Manejo de .env:** Todo secreto debe ser inyectado a través de variables de entorno. Se debe asegurar que el archivo `.env` esté siempre incluido en el `.gitignore` desde el primer commit.
- **Validación de Entorno:** Al arrancar la aplicación, el código debe fallar inmediatamente ("fail-fast") si las variables de entorno críticas de seguridad no están presentes.
