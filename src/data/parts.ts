export interface SpecRow {
  k: string;
  v: string;
}

export interface PartSpec {
  id: string;
  num: string;
  nombre: string;
  en: string;
  de: string;
  tag: string;
  accent: string;
  highlight: { value: string; label: string };
  secciones: { titulo: string; filas: SpecRow[] }[];
  nota: string;
  interno?: boolean; // etiqueta visible solo en vista de corte
}

export const PARTS: PartSpec[] = [
  {
    id: "cono",
    num: "01",
    nombre: "Cono de proa y sección delantera",
    en: "Nose cone & forward section",
    de: "Bugkonus & vordere Sektion",
    tag: "ESTRUCTURA PRIMARIA · TPS",
    accent: "#ffb454",
    highlight: { value: "1 430 °C", label: "pico térmico en el lado de barlovento" },
    secciones: [
      {
        titulo: "Material y fabricación",
        filas: [
          { k: "Material", v: "Acero inoxidable AISI 304L, chapa soldada TIG" },
          { k: "Espesor de piel", v: "3.7 mm (≈ calibre 12)" },
          { k: "Fabricación", v: "Secciones anilladas soldadas orbitalmente" },
        ],
      },
      {
        titulo: "Geometría",
        filas: [
          { k: "Diámetro exterior", v: "9.0 m" },
          { k: "Altura de la sección", v: "≈ 7 m (hombro → punta)" },
          { k: "Perfil", v: "Ojiva de potencia, optimizada para reentrada" },
        ],
      },
      {
        titulo: "Función mecánica",
        filas: [
          { k: "Aloja", v: "Tanque cabecero de LOX, actuadores de flaps, aviónica" },
          { k: "Cargas", v: "Aerodinámicas de reentrada + presurización interna" },
          { k: "Interfaz", v: "Anillo de unión con la sección cilíndrica" },
        ],
      },
      {
        titulo: "Rendimiento",
        filas: [
          { k: "Temp. de pared (barlovento)", v: "hasta 1 430 °C (2 600 °F)" },
          { k: "Temp. criogénica interna", v: "−183 °C (lado del tanque cabecero)" },
          { k: "Margen del acero", v: "Austenítico: tenaz y dúctil en ambos extremos térmicos" },
        ],
      },
    ],
    nota: "El gradiente térmico a través de la pared (≈ 1 600 °C de ΔT) se gestiona con las tejas, el fieltro ablativo y la propia masa del acero.",
  },
  {
    id: "flaps_del",
    num: "02",
    nombre: "Flaps delanteros (×2)",
    en: "Forward flaps (×2)",
    de: "Vordere Klappen (×2)",
    tag: "CONTROL AERODINÁMICO · ACTUACIÓN",
    accent: "#ffb454",
    highlight: { value: "EHA", label: "actuación electro-hidroestática redundante" },
    secciones: [
      {
        titulo: "Material y fabricación",
        filas: [
          { k: "Estructura", v: "Cajón soldado de acero 304L con costillas internas" },
          { k: "Borde de ataque", v: "Aleación base níquel (Inconel) — zona de mayor flujo" },
          { k: "Revestimiento", v: "Tejas cerámicas en la cara de barlovento" },
        ],
      },
      {
        titulo: "Geometría",
        filas: [
          { k: "Envergadura", v: "≈ 2.1 m" },
          { k: "Cuerda media", v: "≈ 2.4 m · flecha moderada" },
          { k: "Posición", v: "Sección delantera, planos opuestos (±X)" },
        ],
      },
      {
        titulo: "Actuación y control",
        filas: [
          { k: "Actuadores", v: "Electro-hidroestáticos (EHA), doble canal redundante" },
          { k: "Alimentación", v: "Eléctrica — sin hidráulica centralizada" },
          { k: "Función", v: "Cabeceo y alabeo en reentrada; control del centro de presiones" },
        ],
      },
      {
        titulo: "Rendimiento",
        filas: [
          { k: "Régimen de trabajo", v: "Mach 25 → subsónico, q̄ creciente" },
          { k: "Borde de ataque", v: "zona crítica del TPS" },
        ],
      },
    ],
    nota: "Durante el descenso la nave vuela «de panza»: los flaps delanteros y traseros fijan la actitud y la velocidad de caída sin superficies aerodinámicas convencionales.",
  },
  {
    id: "flaps_tra",
    num: "03",
    nombre: "Flaps traseros (×2)",
    en: "Aft flaps (×2)",
    de: "Heckklappen (×2)",
    tag: "CONTROL DE DESCENSO · E-HIDRÁULICO",
    accent: "#ffb454",
    highlight: { value: "≈ 3.3 m", label: "envergadura — las mayores superficies de control" },
    secciones: [
      {
        titulo: "Material y fabricación",
        filas: [
          { k: "Estructura", v: "Cajón de acero 304L; punta y bordes con TPS" },
          { k: "Piel", v: "Acero pulido — la mayor parte no necesita tejas" },
          { k: "Actuadores", v: "Electro-hidráulicos alojados dentro del fuselaje" },
        ],
      },
      {
        titulo: "Geometría",
        filas: [
          { k: "Envergadura", v: "≈ 3.3 m" },
          { k: "Cuerda en raíz", v: "≈ 3.7 m → 1.9 m en punta" },
          { k: "Posición", v: "Falda de motores, planos opuestos alineados con los delanteros" },
        ],
      },
      {
        titulo: "Función mecánica",
        filas: [
          { k: "Descenso", v: "Controlan la orientación y la velocidad terminal de caída" },
          { k: "Maniobra de aterrizaje", v: "Paso de «panza» a vertical junto al encendido de los Raptor" },
          { k: "Cargas", v: "Momento aerodinámico máximo justo antes del encendido" },
        ],
      },
      {
        titulo: "Rendimiento",
        filas: [
          { k: "Deflexión", v: "± decenas de grados contra el flujo hipersónico" },
          { k: "Redundancia", v: "2 actuadores por flap — la nave aterriza con uno inoperativo" },
        ],
      },
    ],
    nota: "Los cuatro flaps trabajan en pares: los delanteros mandan el cabeceo fino y los traseros asumen la autoridad gruesa cerca del suelo.",
  },
  {
    id: "escudo",
    num: "04",
    nombre: "Escudo térmico (TPS)",
    en: "Heat shield (TPS)",
    de: "Hitzeschild (TPS)",
    tag: "PROTECCIÓN TÉRMICA · REENTRADA",
    accent: "#ff6b3d",
    highlight: { value: "≈ 18 000", label: "tejas hexagonales fijadas con pines" },
    secciones: [
      {
        titulo: "Material",
        filas: [
          { k: "Tejas", v: "Fibra cerámica de sílice (baja conductividad, alta emisividad)" },
          { k: "Espesor", v: "≈ 60 mm por teja" },
          { k: "Capa posterior", v: "Fieltro ablativo de respaldo" },
        ],
      },
      {
        titulo: "Fijación mecánica",
        filas: [
          { k: "Método", v: "Pines mecánicos — NO adheridas a la piel" },
          { k: "Razón", v: "Dilatación diferencial acero/cerámica (≈ 1 600 °C de ΔT)" },
          { k: "Mantenimiento", v: "Sustitución individual por teja (turnaround rápido)" },
        ],
      },
      {
        titulo: "Cobertura",
        filas: [
          { k: "Extensión", v: "≈ media circunferencia de barlovento + cono de proa" },
          { k: "Patrón", v: "Panal hexagonal, juntas escalonadas contra infiltración" },
          { k: "Zona trasera", v: "Disco cerámico blanco bajo los motores" },
        ],
      },
      {
        titulo: "Rendimiento",
        filas: [
          { k: "Temp. de diseño", v: "1 430 °C (2 600 °F) en pico de reentrada" },
          { k: "Reutilización", v: "Objetivo: inspección y vuelo sin reelaboración mayor" },
        ],
      },
    ],
    nota: "El acero 304L funde a ≈ 1 400–1 450 °C: el TPS mantiene la estructura por debajo de ese umbral en la cara de barlovento.",
  },
  {
    id: "fuselaje",
    num: "05",
    nombre: "Fuselaje y estructura de anillos",
    en: "Airframe & ring structure",
    de: "Rumpf- & Ringstruktur",
    tag: "ESTRUCTURA PRIMARIA · ACERO 301/304L",
    accent: "#e9edf4",
    highlight: { value: "304L", label: "acero inoxidable — no aluminio ni composite" },
    secciones: [
      {
        titulo: "Material",
        filas: [
          { k: "Piel y domos", v: "AISI 304L austenítico soldable" },
          { k: "Anillos / zonas frías", v: "AISI 301 (endurecible por deformación)" },
          { k: "Coste de material", v: "≈ 3 $/kg vs ≈ 40–135 $/kg de Al-Li o composite" },
        ],
      },
      {
        titulo: "Estructura (visible en corte)",
        filas: [
          { k: "Refuerzo transversal", v: "Anillos (ring frames) cada ≈ 0.5–1.5 m" },
          { k: "Refuerzo longitudinal", v: "Stringers entre anillos contra el pandeo" },
          { k: "Espesor de piel", v: "3.7 mm · Ø 9.0 m · 50 m de altura total" },
        ],
      },
      {
        titulo: "Por qué acero (caso mecánico)",
        filas: [
          { k: "Criogenia", v: "σ_y de ≈ 300 MPa @ 20 °C a más del triple @ −196 °C" },
          { k: "Calor", v: "Mantiene resistencia donde el Al pierde ≈ 90 % (≈ 200 °C)" },
          { k: "Punto de fusión", v: "≈ 1 400–1 450 °C (Al: ≈ 660 °C)" },
          { k: "Fabricación", v: "Soldadura rápida al aire libre; reparación trivial" },
        ],
      },
      {
        titulo: "Rendimiento",
        filas: [
          { k: "Concepto", v: "Monocoque presurizado: los tanques SON el fuselaje" },
          { k: "Masa seca de la nave", v: "≈ 100–120 t (estimación pública)" },
        ],
      },
    ],
    nota: "Sin presión interna la estructura es inestable: los ≈ 6 bar de presurización rigidizan el cilindro como un globo de acero.",
  },
  {
    id: "tanques",
    num: "06",
    nombre: "Tanques criogénicos LOX / LCH4",
    en: "LOX / LCH4 cryogenic tanks",
    de: "Kryotanks LOX / LCH4",
    tag: "SISTEMA DE PROPELENTE · CRIOGENIA",
    accent: "#6fd3e7",
    highlight: { value: "≈ 1 200 t", label: "propelente: ~930 t LOX + ~270 t CH4" },
    secciones: [
      {
        titulo: "Tanque de LOX (superior)",
        filas: [
          { k: "Oxidante", v: "Oxígeno líquido, O₂" },
          { k: "Temperatura", v: "−183 °C (90 K)" },
          { k: "Densidad", v: "1 141 kg/m³" },
          { k: "Masa embarcada", v: "≈ 930 t" },
        ],
      },
      {
        titulo: "Tanque de LCH4 (inferior)",
        filas: [
          { k: "Combustible", v: "Metano líquido, CH₄" },
          { k: "Temperatura", v: "−161 °C (112 K)" },
          { k: "Densidad", v: "423 kg/m³ → tanque de mayor volumen" },
          { k: "Masa embarcada", v: "≈ 270 t (relación O/F ≈ 3.5)" },
        ],
      },
      {
        titulo: "Mamparo común (common dome)",
        filas: [
          { k: "Geometría", v: "Domo curvo compartido entre ambos tanques" },
          { k: "Aislamiento", v: "Espuma en la cara de metano (ΔT de solo 22 °C, pero crítica)" },
          { k: "Ventaja", v: "Ahorra un domo completo + masa frente a tanques separados" },
        ],
      },
      {
        titulo: "Tanques cabeceros (header)",
        filas: [
          { k: "LOX header", v: "Esfera dentro del cono de proa" },
          { k: "CH4 header", v: "Pequeño tanque junto al domo trasero" },
          { k: "Función", v: "Alimentan los motores en el aterrizaje, con la nave casi vacía e inclinada" },
        ],
      },
      {
        titulo: "Rendimiento",
        filas: [
          { k: "Presurización", v: "Autogénica (gas caliente de los motores) ≈ 6 bar" },
          { k: "Estructural", v: "Piel de 3.7 mm soporta presión + flexión global" },
        ],
      },
    ],
    nota: "El LOX va arriba y el metano abajo: el CH₄ es menos denso y necesita más volumen, y alejar el LOX del calor de los motores simplifica el aislamiento.",
    interno: true,
  },
  {
    id: "puerta",
    num: "07",
    nombre: "Compuerta de carga útil",
    en: "Payload bay door",
    de: "Nutzlastbucht-Klappe",
    tag: "MECANISMO · BAHÍA DE CARGA",
    accent: "#ffb454",
    highlight: { value: "≈ 7 × 6 m", label: "panel curvo integrado en la piel" },
    secciones: [
      {
        titulo: "Geometría",
        filas: [
          { k: "Panel", v: "Segmento curvo de la propia piel, ≈ 7 m × 6 m" },
          { k: "Posición", v: "Sección delantera, lado de sotavento (opuesto al TPS)" },
          { k: "Integración", v: "Enrasada con el fuselaje para no degradar el flujo" },
        ],
      },
      {
        titulo: "Mecanismo",
        filas: [
          { k: "Bisagras", v: "2 actuadores rotativos en el borde longitudinal" },
          { k: "Apertura", v: "Tipo concha hacia el exterior, solo en órbita" },
          { k: "Retención", v: "Cierres mecánicos redundantes — bahía no presurizada" },
        ],
      },
      {
        titulo: "Función",
        filas: [
          { k: "Acceso", v: "Bahía de carga: satélites (Starlink V2), carga voluminosa, variantes lunares" },
          { k: "Operación", v: "Se abre en vacío orbital; sellada antes de la reentrada" },
        ],
      },
      {
        titulo: "Rendimiento",
        filas: [
          { k: "Cargas", v: "Presurización del tanque LOX adyacente + ciclado térmico orbital" },
          { k: "Rigidez", v: "Marcos perimetrales para no comprometer el cilindro presurizado" },
        ],
      },
    ],
    nota: "Recortar la piel de un cilindro presurizado concentra tensiones: los marcos y anillos adyacentes se sobredimensionan para compensar el vano.",
  },
  {
    id: "raptor",
    num: "08",
    nombre: "Sección de propulsión — 6 × Raptor 3",
    en: "Propulsion section — 6 × Raptor 3",
    de: "Antriebssektion — 6 × Raptor 3",
    tag: "PROPULSIÓN · FFSC · CH4/LOX",
    accent: "#ff6b3d",
    highlight: { value: "330 bar", label: "presión de cámara — récord en motor de vuelo" },
    secciones: [
      {
        titulo: "Configuración",
        filas: [
          { k: "Motores", v: "3 × Raptor nivel del mar (centrales) + 3 × Raptor Vacuum (perimetrales)" },
          { k: "RVac", v: "Tobera extendida de gran relación de expansión" },
          { k: "Gimbal", v: "Los 3 SL montan actuadores de cardán (TVC); los RVac son fijos" },
        ],
      },
      {
        titulo: "Ciclo termodinámico",
        filas: [
          { k: "Ciclo", v: "Combustión escalonada de flujo completo (full-flow staged combustion)" },
          { k: "Arquitectura", v: "2 prequemadores y 2 turbobombas — todo el caudal pasa por turbina" },
          { k: "P. de cámara", v: "≈ 330 bar — la más alta lograda en un motor de vuelo" },
          { k: "Propelente", v: "CH₄/LOX: metano por reutilización (menos coque en la tobera)" },
        ],
      },
      {
        titulo: "Rendimiento por motor",
        filas: [
          { k: "Empuje SL", v: "≈ 2.45 MN (250 tf)" },
          { k: "Empuje RVac", v: "≈ 2.70 MN (275 tf)" },
          { k: "Isp", v: "≈ 350 s (nivel del mar) / ≈ 380 s (vacío, RVac)" },
          { k: "Empuje total (6)", v: "≈ 15.5 MN" },
        ],
      },
      {
        titulo: "Reutilización",
        filas: [
          { k: "Objetivo", v: "Vuelo sin overhaul entre misiones" },
          { k: "Raptor 3", v: "Escudo térmico integrado, líneas ocultas, menos piezas" },
        ],
      },
    ],
    nota: "El flujo completo es el ciclo más eficiente y más difícil: ambos prequemadores trabajan a presiones extremas sin quemar las turbinas.",
  },
  {
    id: "puck",
    num: "09",
    nombre: "Estructura de empuje (thrust puck)",
    en: "Thrust structure (thrust puck)",
    de: "Schubstruktur (Thrust Puck)",
    tag: "TRANSMISIÓN DE CARGAS · ESTRUCTURA",
    accent: "#e9edf4",
    highlight: { value: "≈ 15.5 MN", label: "empuje total transmitido al fuselaje" },
    secciones: [
      {
        titulo: "Material y fabricación",
        filas: [
          { k: "Material", v: "Acero 304L soldado y mecanizado" },
          { k: "Geometría", v: "Disco central («puck») con costillas radiales hacia los anillos" },
          { k: "Fabricación", v: "Mecanizado CNC de gran porte + soldadura robotizada" },
        ],
      },
      {
        titulo: "Función estructural",
        filas: [
          { k: "Misión", v: "Recoger el empuje de los 6 motores y repartirlo al domo trasero y la piel" },
          { k: "Carga axial", v: "≈ 15.5 MN en ascenso" },
          { k: "Cargas laterales", v: "Par de gimbal de los motores centrales (TVC)" },
        ],
      },
      {
        titulo: "Interfaces",
        filas: [
          { k: "Motores", v: "Puntos de cardán y pernos de retención sobre el puck" },
          { k: "Líneas", v: "Pasos sellados para LOX/CH4 hacia los colectores" },
          { k: "Protección", v: "Escudo cerámico bajo el puck (recirculación de gases)" },
        ],
      },
    ],
    nota: "Es la pieza con mayor densidad de carga de la nave: concentra ~15.5 MN en un disco de ~4 m y lo difunde al cilindro sin pandear el domo.",
    interno: true,
  },
  {
    id: "lineas",
    num: "10",
    nombre: "Líneas de propelente",
    en: "Propellant feed lines",
    de: "Treibstoffleitungen",
    tag: "ALIMENTACIÓN CRIOGÉNICA",
    accent: "#6fd3e7",
    highlight: { value: "−183 °C", label: "LOX criogénico del tanque al motor" },
    secciones: [
      {
        titulo: "Línea de LOX (bandas cian)",
        filas: [
          { k: "Recorrido", v: "Domo común → bajante exterior (downcomer) → colector del puck" },
          { k: "Diámetro", v: "≈ 0.8–1.0 m" },
          { k: "Por qué exterior", v: "El LOX debe rodear el tanque de metano para llegar a los motores" },
        ],
      },
      {
        titulo: "Línea de CH4 (bandas ámbar)",
        filas: [
          { k: "Recorrido", v: "Domo trasero → alimentación central → colector" },
          { k: "Cabeceros", v: "Líneas independientes desde los header para el aterrizaje" },
        ],
      },
      {
        titulo: "Componentes",
        filas: [
          { k: "Juntas", v: "Fuelles criogénicos (absorben contracción ≈ 3 mm por metro)" },
          { k: "Válvulas", v: "Mariposas criogénicas neumáticas, corte en milisegundos" },
          { k: "Soportes", v: "Cunas aisladas — evitan puentes térmicos al fuselaje" },
        ],
      },
      {
        titulo: "Rendimiento",
        filas: [
          { k: "Caudal total", v: "≈ 4 t/s de propelente a pleno empuje (6 motores)" },
          { k: "Diseño", v: "Caída de presión ajustada a la succión de turbobombas (anti-cavitación)" },
        ],
      },
    ],
    nota: "A −183 °C el acero se contrae ≈ 3 mm por metro: cada línea necesita fuelles o cunas deslizantes o arrancaría sus propias bridas.",
    interno: true,
  },
];

export const PART_BY_ID: Record<string, PartSpec> = Object.fromEntries(
  PARTS.map((p) => [p.id, p])
);
