# ApapachaPet 2.0 — Spec del Sistema de Diseño

**Estado:** Dirección visual aprobada por el usuario (mockup v2).
**Fecha:** 2026-07-08
**Mockup de referencia:** artifact `apapacha-2.0` (premium/cálido, luminoso, gradiente firma, íconos propios, fondo animado).

## 1. Objetivo

Elevar la percepción de la app de "básica" a **premium, cálida y de confianza**, sin cambiar la lógica ni la funcionalidad — solo la capa visual. Ataca los 4 dolores que reportó el usuario: tipografía genérica, componentes planos/repetitivos, exceso de color plano + emojis, y falta de jerarquía/aire.

## 2. Principios de diseño

1. **Luminoso y aireado** — fondos casi blancos con tinte lila, mucho espacio en blanco.
2. **Gradiente firma** — lila→lavanda (`#7C4DBB → #B98AE0`) en acentos protagonistas (botones primarios, avatares, FAB, barras, headers). El morado es el único acento protagonista (se evita el cliché crema+terracota).
3. **Sin emojis en UI estructural** — se reemplazan por un set de íconos consistente. Emojis solo como contenido del usuario (nombres de mascotas, etc.), nunca como marcadores de sección.
4. **Tipografía editorial** — display serif con carácter (Fraunces) para títulos/números; sans limpia (Plus Jakarta Sans) para cuerpo.
5. **Profundidad por capas** — sombras suaves teñidas de morado, radios generosos, tarjetas foto-first.
6. **Movimiento sutil** — fondo ambiental que respira; estados de press; nada estridente; respeta `prefers-reduced-motion`.

## 3. Tokens de color (`src/theme/colors.ts` v2)

Se mantiene `colors` como fuente de verdad, pero se reestructura a **tokens semánticos** con soporte claro/oscuro. Propuesta (modo claro):

| Token | Hex | Uso |
|-------|-----|-----|
| `ground` | `#FCFAFF` | Fondo de app (near-white, tinte lila) |
| `ground2` | `#F6F0FC` | Fondo hundido / insets |
| `surface` | `#FFFFFF` | Tarjetas |
| `ink` | `#2C2340` | Texto principal (tinta suave, no negro duro) |
| `inkSoft` | `#8B7FA6` | Texto secundario |
| `brand` | `#7C4DBB` | Morado principal (más claro/amigable que el `#6B35A0` actual) |
| `brand2` | `#B98AE0` | Lila (extremo del gradiente) |
| `brandDeep` | `#5E2E93` | Morado hondo (press/hover) |
| `brandTint` | `#F3EBFB` | Fondo suave morado (chips/fills) |
| `leaf` | `#57B06B` | Verde "verificado"/éxito |
| `gold` | `#EBAE3E` | Estrellas/rating |
| `line` | `#EFE7F6` | Bordes hairline |

**Gradientes:**
- `gradBrand`: `['#7C4DBB', '#B98AE0']` (135°) — botones, avatar, FAB.
- `gradHero`: `['#EFE4FB', '#FCE9F1', '#E6F6EC']` — washes suaves, fondo de cards de reputación, blobs.

**Modo oscuro** (plum suave, no negro): `ground #181322`, `surface #241C34`, `ink #F2ECFA`, `brand #C6A3EC`, etc. Se definen los mismos tokens con valores dark. Se conservan los semánticos existentes (success/danger/warning/info) reafinados a la nueva base.

> Implementación: `colors` pasa a exponer los tokens claros + un `colorsDark`, y un hook/contexto `useThemeColors()` que devuelve el set según el tema del sistema. (Fase 1 puede empezar solo con el set claro y agregar dark después, para no bloquear.)

## 4. Tipografía (`src/theme/typography.ts` nuevo + `expo-font`)

- **Display:** Fraunces (serif cálida, variable) — títulos de pantalla, números grandes (rating, KPIs), nombres.
- **Cuerpo/UI:** Plus Jakarta Sans — todo el resto.
- **Escala:** `display1 34/600`, `display2 26/600`, `h 20/700`, `body 15/500`, `bodyStrong 15/700`, `small 13`, `label 12/800 uppercase +0.12em`.

Setup: `useFonts` de `expo-font` con `@expo-google-fonts/fraunces` y `@expo-google-fonts/plus-jakarta-sans`, cargadas en `App.tsx` con splash hasta que estén listas. Helper `text` (o componente `<AppText variant="...">`) para aplicar familia+tamaño+tracking de forma consistente.

## 5. Elevación, radios, espaciado (`src/theme/design.ts`)

- **Radii:** `sm 10 / md 16 / lg 22 / xl 30 / full 999` (ya cercano; se sube `lg` a 22).
- **Shadows:** tres niveles teñidos de morado (`rgba(92,46,147,·)`) — `sm` cards, `md` hover/modales, `lg` teléfono/hero.
- **Spacing:** `xs4 / sm8 / md12 / lg16 / xl20 / xxl28 / xxxl40` — ritmo más generoso.

## 6. Iconografía

- **Base:** Ionicons (`@expo/vector-icons`, ya instalado) — line icons consistentes para la mayoría (home, compass, search, calendar, person, shield-checkmark, star, heart, cash, chatbubbles, paw).
- **Custom (react-native-svg):** 1–2 íconos de marca donde Ionicons no calza fino (p. ej. la huella "paw" del FAB con el estilo del mockup, cara de gato). Set pequeño en `src/components/icons/`.
- **Regla:** retirar emojis de headers, botones, badges, banners, nav. Mantener emojis solo si son contenido del usuario.

## 7. Componentes core (`src/components/ui/`)

Componentes reutilizables que encapsulan el sistema (hoy los estilos están repetidos inline en cada pantalla):

- `AppText` — tipografía por variante.
- `Button` — `primary` (gradiente), `ghost` (outline), `pill`; con ícono opcional y estado de carga.
- `Card` / `ListingCard` — tarjeta foto-first (imagen, badge verificado, rating, host+nivel, precio).
- `Chip` / `Tag` — `brand` / `leaf` / `line`, con ícono opcional.
- `RatingStars` — estrellas doradas (SVG/Ionicons) + score.
- `StatTile` — KPI con ícono, valor (display), label.
- `Banner` — informativo/KYC (ícono en caja, título, texto, borde de acento).
- `Avatar` — inicial sobre gradiente o tint.
- `GradientHeader` / `Screen` — contenedor de pantalla con fondo `ground` + `AnimatedBackground` opcional.
- `AnimatedBackground` — 2–3 blobs `LinearGradient` con `Animated` loop lento; se usa en pantallas hero (Home/Explore/Perfil), desactivable, respeta reduce-motion.

## 8. Movimiento

- **Fondo ambiental:** blobs de gradiente desenfocados, deriva lenta (~20s), opacidad baja. Solo en pantallas hero para cuidar rendimiento.
- **Press states:** `activeOpacity`/scale sutil en botones y cards.
- Nada de animaciones llamativas; `prefers-reduced-motion`/ajuste de sistema desactiva el loop.

## 9. Dependencias a agregar

```
expo-linear-gradient
react-native-svg
expo-font
@expo-google-fonts/fraunces
@expo-google-fonts/plus-jakarta-sans
```
(Instalar con `npx expo install` para versiones compatibles con SDK 54.)

## 10. Estrategia de migración

El sistema se centraliza en `theme/` + `components/ui/`, y las pantallas **consumen tokens/componentes** en lugar de estilos inline. Se migra pantalla por pantalla sin tocar la lógica.

1. **Fundamentos:** tokens (colors v2, design.ts, typography.ts), cargar fuentes en App.tsx, crear `components/ui/` base + `AnimatedBackground`, instalar deps.
2. **Pantallas hero:** Explore, SpaceDetail, VisiterDetail, Home, Profile.
3. **Flujo core:** Bookings, HostDashboard, Checkout, LeaveReview.
4. **Auth/onboarding:** Login, Onboarding, SetPassword, ClientVerification.
5. **Resto:** Admin, Inbox/Chat, modales secundarios.

Cada fase compila (typecheck) y se despliega, para validar incrementalmente.

## 11. Fuera de alcance (YAGNI)

- No se cambia lógica, navegación ni funcionalidad — solo la capa visual.
- No se usan imágenes generadas por IA por ahora (Higgsfield requiere autorización aparte); las fotos reales de espacios/gatos ya existen vía Storage, y los placeholders usan gradientes.
- Modo oscuro completo puede diferirse a una fase posterior si urge el claro primero.

## 12. Criterios de éxito

- Ninguna pantalla usa la fuente del sistema por defecto para títulos.
- Cero emojis en UI estructural (headers/botones/badges/nav).
- Botones/cards/chips vienen de `components/ui/`, no de estilos inline duplicados.
- La app se siente luminosa, con jerarquía clara y el gradiente de marca como acento coherente.
