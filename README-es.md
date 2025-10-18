# Filer: Desarrollo Dirigido por Dominio Sin Infraestructura

**Modelado conceptual de dominio + persistencia transparente con event sourcing + interfaces gráficas enriquecidas sintetizadas —todo en el navegador, sin servidor, cero dependencias.** Define tu dominio a nivel conceptual (p. ej. E/R), y Filer sintetiza prototipos JavaScript, persistencia, validación e interfaces de usuario interactivas al vuelo. Tus datos y tu esquema coexisten como iguales en la misma imagen de memoria, permitiendo una flexibilidad sin precedentes: cambia el esquema, los datos existentes se adaptan automáticamente. Sin migraciones, sin ORMs, sin desajuste de impedancia—sólo objetos JavaScript que se persisten a sí mismos e interfaces gráficas que se materializan desde los metadatos.

![Ejemplo de Navigator](docs/img/navigator-example.png)

*Exploración interactiva de dominio: navega tus grafos de objetos, ejecuta JavaScript, visualiza relaciones—todo sin servidor ni base de datos.*

---

## Visión: Modelado Autónomo de Dominios

Filer te permite **definir y ejecutar tus propios dominios localmente**—sin servidores, bases de datos o infraestructura—mientras habilita compartir y colaborar sin fricciones. Modela tu dominio conceptualmente (p. ej. *Empleado, Departamento, Salario*), y Filer **sintetiza** la capa de persistencia, lógica de validación e interfaz de usuario enriquecida automáticamente. ¿Cambiaste tu esquema? El sistema se adapta instantáneamente. Tus datos y metadatos coexisten en la misma imagen de memoria, eliminando la división esquema/datos que afecta a los sistemas tradicionales.

---

## Pruébalo Ahora

**Cero instalación. Cero configuración. Cero servidor.**

1. Descarga [`dist/index.html`](dist/index.html) (118KB, autocontenido)
2. Ábrelo en tu navegador (funciona con el protocolo `file://`—no necesitas servidor)
3. Haz clic en **"Load Example"** para explorar el esquema clásico EMP/DEPT
4. Navega el grafo de objetos, inspecciona valores, ejecuta JavaScript en el REPL
5. Todos los cambios persisten automáticamente—recarga la página, tus datos siguen ahí

Eso es todo. Sin npm install, sin configuración de base de datos, sin archivos de configuración. Sólo abre y comienza a trabajar.

¡La visión completa aún está en desarrollo pero funciona y puedes probarla ahora!

---

## ¿Por Qué Filer?

### Persistencia Transparente a Velocidad de RAM

- **Sin ORM, sin base de datos, sin desajuste de impedancia**: Tus objetos JavaScript se persisten a sí mismos vía proxies transparentes
- **Event sourcing integrado**: Cada mutación (`emp.sal = 5000`) se registra automáticamente como un evento
- **Depuración con viaje en el tiempo**: Reproduce eventos a cualquier punto en la historia—inspecciona el estado en cualquier momento
- **Auditoría completa**: Historial completo de todos los cambios para cumplimiento y depuración
- **Sincronización delta**: Transmite sólo eventos, no el estado completo—colaboración eficiente

### Interfaz Gráfica Enriquecida Sintetizada desde Metadatos

- **Formularios, tablas e inspectores generados al vuelo** desde tus definiciones de esquema
- **UI dirigida por esquema**: Cambia el esquema, la UI se adapta instantáneamente—sin plantillas, sin recompilaciones
- **Cero generación de código**: Todo se sintetiza en tiempo de ejecución, siempre sincronizado
- **Entrada de datos con seguridad de tipos**: Reglas de validación aplicadas automáticamente vía traps de Proxy
- **IntelliSense y autocompletado** en el editor integrado (en desarrollo)

### JavaScript ES el Lenguaje de Consultas

- **Sin SQL, sin DSL de consultas**: Usa JavaScript directamente—`emps.filter(e => e.sal > 3000)`
- **Acceso programático completo**: REPL para exploración, pruebas y scripting
- **Sin cambio de contexto**: Permanece en JavaScript para consultas, mutaciones y lógica
- **Rendimiento nativo**: Sin capa de traducción—acceso directo a objetos a velocidad de RAM

### Desarrollo Dirigido por REPL

- **Explora tu dominio interactivamente**: Prueba ideas antes de comprometerte
- **Inspecciona grafos de objetos visualmente**: Navega relaciones con la vista de árbol
- **Ejecuta scripts, guarda favoritos**: Construye una biblioteca de consultas y operaciones útiles (próximamente)
- **Retroalimentación inmediata**: Ve resultados instantáneamente, sin ciclo compilar-recompilar-recargar

---

**¿Intrigado? ¿Interesado pero escéptico?** Echa un vistazo a [la visión de Filer en pocas palabras](./docs/vision-in-a-nutshell.md) (algo extenso: ~20 páginas, en inglés). Los valientes y curiosos también pueden querer leer la [visión completa de Filer](./docs/vision.md) (decididamente extenso: 56 páginas que valen la pena leyendo, explorando el arco de 40 años desde UNIFILE a Prevayler a Filer, y por qué este momento de convergencia importa, en inglés).

Visión completa [en español](./docs/vision-es.md) ([PDF](./docs/vision-es.pdf)).

Visão completa [em português](./docs/visao-pt.md) ([PDF](./docs/visao-pt.pdf)).

¿Tienes prisa? ¡Sigue leyendo!

---

## Arquitectura por Diseño

### Sin Dependencias de Implementación

- **JavaScript puro**: Sin bibliotecas externas en código de producción
- **Cero paquetes npm en tiempo de ejecución**: Autocontenido, sin infierno de dependencias
- **Sin herramientas de compilación requeridas para ejecutar**: Abre `dist/index.html` y listo
- **Un solo archivo de 118KB**: Todo inline—HTML, CSS, JavaScript

### 100% En el Navegador

- **Se ejecuta completamente en el navegador**: Sin procesamiento del lado del servidor requerido
- **IndexedDB para persistencia**: Opcional, para almacenamiento local de largo plazo
- **Fallback a LocalStorage**: Si IndexedDB no está disponible
- **Persistencia basada en archivos**: Disponible cuando se ejecuta en Node.js

### Sin Servidor Requerido

- **Funciona con el protocolo `file://`**: No necesitas servidor HTTP (¡pero eso también funciona!)
- **Puede servirse estáticamente**: GitHub Pages, Netlify, Vercel, S3—cualquier host estático
- **Desplegable en cualquier lugar**: Envíalo por email, hospédalo, o ejecútalo localmente
- **Ejecución del lado del servidor soportada**: MemImg funciona en Node.js para uso backend

---

## Componentes

### MemImg: Motor de Persistencia con Event Sourcing

**Biblioteca independiente. Funciona en navegador y Node.js. Cero acoplamiento con UI.**

MemImg envuelve tus objetos JavaScript en proxies transparentes que automáticamente registran cada mutación como un evento. No llamas a save()—los objetos se persisten a sí mismos transaccionalmente.

**Cómo funciona:**

```javascript
import { createMemoryImage } from './src/memimg/memimg.js';

const root = createMemoryImage({}, { eventLog });

// Cada mutación se rastrea automáticamente
root.emps = [];
root.emps.push({ empno: 7839, ename: "KING", sal: 5000 });
root.emps[0].sal = 5500;  // Registrado como evento SET

// Reproduzca eventos para reconstruir estado
const root2 = await replayEventsFromLog({ eventLog });
// root2 === root (mismo estado, reconstruido desde eventos)
```

**Capacidades:**

- **Persistencia Transparente**: Sólo asigna propiedades—`emp.sal = 5000`—y los cambios se registran
- **Depuración con Viaje en el Tiempo**: Reproduce eventos a cualquier punto en el tiempo
- **Sincronización Delta**: Transmisión eficiente de estado vía streams de eventos
- **Snapshots Automáticos**: Serializa grafos de objetos completos con manejo de ciclos
- **Aislamiento Transaccional**: Actualizaciones optimistas con commit/rollback (`save()` o `discard()`)

**Puede usarse independientemente** para:
- Persistencia del lado del servidor (Node.js)
- Aplicaciones offline-first
- Edición colaborativa (tipo CRDT vía logs de eventos)
- Funcionalidad undo/redo
- Auditorías y cumplimiento

**Calidad**: 913 pruebas, 94.74% de cobertura de código, 100% pasando

---

### Navigator: Explorador Interactivo de Dominios

**REPL basado en navegador, visualizador de grafos de objetos y editor de scripts.**

Navigator proporciona una UI enriquecida para explorar y manipular tu modelo de dominio interactivamente:

- **Vista de Árbol**: Navega grafos de objetos anidados visualmente—expandir/colapsar, profundizar en referencias
- **Inspector**: Ve propiedades, valores y tipos inline—ve todo sobre cualquier objeto
- **Editor de Scripts**: Escribe y ejecuta JavaScript con resaltado de sintaxis y autocompletado
- **Historial de Scripts**: Guarda y reutiliza scripts favoritos—construye tu propia biblioteca de consultas
- **Interfaz Multi-Pestaña**: Trabaja con múltiples Imágenes de Memoria simultáneamente—compara estados lado a lado

**Sin configuración requerida**—sólo carga tus datos y explora.

**Calidad**: 427 pruebas, 100% pasando

---

### Metadata: Modelado Conceptual de Dominio Ejecutable

**Modela tu dominio a nivel conceptual. Filer sintetiza el resto.**

Aquí es donde brilla el poder de Filer. En lugar de escribir clases, constructores, getters, setters, lógica de validación y plantillas de UI, defines tu dominio **conceptualmente**—como en Entidad/Relación o Modelado de Objetos-Roles—y Filer **sintetiza** prototipos JavaScript, fábricas de objetos, persistencia, validación e interfaces gráficas enriquecidas al vuelo.

**Modelado Conceptual:**

```javascript
const Dept = ObjectType({
  name: 'Dept',
  properties: {
    deptno: { type: NumberType, required: true, unique: true },
    dname:  { type: StringType, label: "Department Name" },
    loc:    { type: StringType, label: "Location" }
  }
});

const Emp = ObjectType({
  name: 'Emp',
  properties: {
    empno: { type: NumberType, required: true, unique: true },
    ename: { type: StringType, label: "Employee Name" },
    sal:   { type: NumberType, min: 0, label: "Salary" },
    dept:  { type: Dept, label: "Department" }  // Referencia
  }
});
```

**Lo Que Filer Sintetiza Automáticamente:**

1. **Fábricas de objetos** (no clases — enfoque funcional, centrado en JavaScript)
2. **Aplicación de seguridad de tipos** vía traps de Proxy—¿asignar una cadena a `sal`? Error en tiempo de ejecución.
3. **Formularios y tablas** generados desde metadatos—agregue una propiedad, el formulario se actualiza instantáneamente
4. **Validación de datos** basada en restricciones (required, min/max, unique, regex, custom)
5. **Integridad referencial** mantenida automáticamente—referencias `dept` son verificadas por tipo

**Síntesis, No Generación de Código:**

- **Sin paso de compilación**: Los cambios toman efecto inmediatamente
- **Sin archivos generados**: Todo vive en memoria, sintetizado bajo demanda
- **Siempre sincronizado**: Los metadatos SON la implementación—imposible que diverjan
- **Introspección en tiempo de ejecución**: Examina y modifica esquemas en tiempo de ejecución

**El Metamodelo: Los Metadatos Se Describen a Sí Mismos**

Aquí está la idea clave: **El sistema de metadatos se describe a sí mismo usando sí mismo.**

Los tipos que definen `Dept` y `Emp` (`ObjectType`, `NumberType`, `StringType`) están ellos mismos definidos usando la misma fábrica `ObjectType`. Esto significa que:

- La **misma maquinaria de persistencia** que guarda instancias de `Emp` puede guardar la definición del esquema `Emp` en sí
- La **misma GUI sintetizada** que edita registros de empleados puede editar el esquema de empleados
- **Los metadatos y datos coexisten** en la misma MemImg—sin archivos de esquema separados, sin migraciones
- Los usuarios pueden **definir y modificar esquemas interactivamente** vía GUI, sin herramientas de diagramación requeridas
- Los metadatos **ejecutan** el sistema a la existencia—los metadatos SON datos SON el sistema

**Esto es *enacción***: Los metadatos no meramente describen el sistema—**SON** el sistema.

---

## Los Metadatos SON Datos: Sin Infierno de Migraciones

Los sistemas tradicionales separan el esquema (DDL) de los datos (filas). Esto crea fricción:

- **Los cambios de esquema requieren migraciones**: ¿Agregar una columna? Escribe SQL de migración, versiónalo, pruébalo, despliégalo.
- **El esquema y los datos se versionan por separado**: ¿Esquema en v12, datos de v8? Buena suerte.
- **Export/import requiere archivos de esquema**: Datos sin esquema son inútiles, esquema sin datos está vacío.

**Filer colapsa esta distinción.**

Ya que las definiciones de metadatos (tipos `Dept`, `Emp`) se almacenan en la **misma MemImg** que las instancias de dominio (empleados reales), emergen varias propiedades poderosas:

### Export/Import "Simplemente Funciona"

Serializa la MemImg → obtienes **tanto** metadatos COMO datos en un solo snapshot JSON. Impórtalo en cualquier lugar, y tienes el sistema completo y funcional. Sin archivos de esquema separados, sin desajustes de versión.

### La Evolución de Esquema es Automática

¿Agregar una propiedad a `Emp`? Las instancias de empleado existentes pueden recibir valores por defecto automáticamente—sin scripts de migración manual.

¿Remover una propiedad? Sólo deja de referenciarla en tus metadatos—los datos existentes permanecen intactos (no se necesitan eliminaciones en cascada).

¿Cambiar un tipo? La validación se adapta instantáneamente porque la validación lee los metadatos vivos en tiempo de ejecución.

### Los Metadatos Son Mutables

Ya que los metadatos viven en la misma MemImg que los datos, puedes **mutar el esquema en tiempo de ejecución** como cualquier otro objeto:

```javascript
// Agregar una nueva propiedad al esquema Emp
Emp.properties.hireDate = { type: DateType, label: "Hire Date" };

// Los formularios y validación se actualizan inmediatamente—sin recompilación, sin reinicio
```

Esto **no** es trucos de hot-reloading o live-reloading. Los metadatos **SON** un objeto JavaScript en memoria, y cambiarlo cambia el comportamiento del sistema instantáneamente.

---

## Características Próximas

### Definición Puramente Declarativa de Dominio (Sin Código)

- **Configuración de propiedades vía formularios** (no se requiere JavaScript)—**ya en desarrollo**
- **Vista previa instantánea de UI sintetizada** (no generada—sin paso de compilación)
- **Sin herramientas de migración necesarias**: Ya que metadatos y datos coexisten en la misma MemImg, la evolución de esquema es automática—cambia la definición del tipo `Emp`, y las instancias existentes de `Emp` pueden adaptarse automáticamente
- **Diseñador visual de esquemas** (arrastrar-y-soltar entidad/relación) —**podría implementarse**

**¿Por qué "podría implementarse" para el diseñador visual?**

- Los formularios para editar metadatos están **ya en desarrollo** (los metadatos usan el mismo motor de síntesis)
- Una UI de arrastrar-y-soltar sería bueno-tener pero no necesaria
- La definición de esquema basada en JavaScript es realmente bastante concisa

### Lenguaje Natural Controlado Asistido por LLM

- **Describe tu dominio en español simple**: Sin código, sin diagramas, sólo conversación
- **El LLM traduce a especificaciones formales de metadatos**: Lenguaje natural → definiciones `ObjectType`
- **Refinamiento interactivo**: Haz preguntas de seguimiento, ajusta propiedades, previsualiza resultados
- **Modelado de dominio manos libres**: De idea a sistema funcional en minutos
- **Ejemplo**: *"Crea una entidad Empleado con nombre, salario y una referencia a Departamento"*

---

## Estructura del Proyecto

```
filer/
├── src/
│   ├── memimg/              # Motor de persistencia con event sourcing
│   ├── navigator/           # Explorador/REPL interactivo
│   ├── metadata/            # Modelado conceptual de dominio
│   └── app/                 # Shell de aplicación
│
├── test/
│   ├── memimg/             # 913 pruebas, 94.74% cobertura
│   ├── navigator/          # 427 pruebas, 100% pasando
│   ├── metadata/           # Infraestructura lista
│   └── integration/        # Pruebas entre componentes
│
└── dist/
    └── index.html          # App desplegable de archivo único (118KB)
```

---

## Desarrollo

### Prerequisitos
- Node.js 22+
- npm

### Inicio Rápido
```bash
# Clonar repositorio
git clone https://github.com/xrrocha/filer.git
cd filer

# Instalar dependencias
npm install

# Compilar
npm run build

# Ejecutar pruebas
npm test                    # Todas las pruebas
npm run test:memimg        # Pruebas MemImg (913 pruebas)
npm run test:navigator     # Pruebas Navigator (427 pruebas)
npm run test:metadata      # Pruebas Metadata

# Cobertura
npm run test:coverage

# Modo desarrollo
npm run dev
```

Vea [SETUP.md](SETUP.md) para configuración detallada del entorno de desarrollo (instrucciones multiplataforma Linux/macOS, en inglés).

---

## Filosofía

### Claridad a Través de Simplificación

Filer abraza la naturaleza dinámica de JavaScript en lugar de luchar contra ella. Sin gimnasia de TypeScript, sin query builders de ORM, sin pipelines de generación de código—sólo objetos JavaScript mejorados con persistencia transparente y síntesis dirigida por esquema.

### Poder a Través de Capas

La arquitectura está deliberadamente en capas:

1. **MemImg** (Capa 1): Event sourcing puro, sin acoplamiento de UI—usable independientemente
2. **Navigator** (Capa 2): UI para exploración, sin conocimiento de dominio—funciona con cualquier dato
3. **Metadata** (Capa 3): Motor de modelado de dominio y síntesis—junta todo

Cada capa funciona independientemente. Usa MemImg solo para persistencia. Usa Navigator con cualquier estructura de datos. Combina las tres para poder completo.

### Enacción sobre Configuración

Las herramientas tradicionales te piden **describir** tu dominio (diagramas UML, modelos ER, interfaces TypeScript) y luego **implementarlo** por separado (escribir clases, migraciones, plantillas de UI). Esto crea **dos fuentes de verdad** que inevitablemente divergen.

Filer colapsa esta dicotomía: **Los metadatos SON la implementación.**

- Define tu esquema una vez—la persistencia, integridad y UI se sintetizan automáticamente
- Cambia el esquema—todo se adapta instantáneamente, sin recompilación requerida
- Los metadatos no describen el sistema—**ejecutan** el sistema a la existencia

Esto no es configuración-sobre-código o convención-sobre-configuración. Esto es **enacción**: los metadatos SON datos SON el sistema. No hay separación.

---

## Licencia

Apache 2.0

---

## Contribuir

¡Contribuciones bienvenidas! Por favor lea [SETUP.md](SETUP.md) para configuración del entorno de desarrollo (incluye instrucciones de portabilidad Linux/macOS, en inglés).

---

## Créditos

**Autor**: Ricardo Rocha
**Repositorio**: [github.com/xrrocha/filer](https://github.com/xrrocha/filer)

Partitura: Ricardo. Ejecución: Claude Code. Hasta ahora, todo bien.

---

## Inspiración y Referencias

Filer se construye sobre ideas de varias fuentes fundamentales:

- **[Memory Image de Martin Fowler](https://martinfowler.com/bliki/MemoryImage.html)** - Patrón central para mantener el modelo de dominio completo en memoria para rendimiento y simplicidad
- **[KMemImg](https://amauta.medium.com/memory-image-in-kotlin-a2b7782ed842)** - Implementación previa explorando conceptos de memory image en Kotlin
- **[Prevayler](https://prevayler.org)** - Pionero en persistencia de objetos transparente basada en event sourcing para Java

- **[UNIFILE.pdf](https://rrocha.me/projects/filer/references/UNIFILE.pdf)** - Fundamento académico explorando modelado conceptual y visualización a nivel de usuario

***Filer: Porque tu modelo de dominio merece algo mejor que un ORM.***
