import type { NodeKind } from '@/types/iceberg';

const RULES: [RegExp, string][] = [
  [/\bore\b|bauxite|hematite|magnetite|raw ore/i, '🪨'],
  [/crude|petroleum|wellhead/i, '🛢️'],
  [/\bsand\b|gravel|clay|stone|rock|quartzite|limestone/i, '🪨'],
  [/\bbale\b|cotton|wool|raw fiber|flax/i, '🧶'],
  [/\blog\b|felled|standing tree|timber/i, '🪵'],
  [/chair|stool|seat|bench|sofa|couch|armchair/i, '🪑'],
  [/backrest|back\b/i, '🪑'],
  [/leg\b|legs\b/i, '🦵'],
  [/table|desk|shelf|workbench/i, '🪵'],
  [/lamp|light|bulb|led/i, '💡'],
  [/backpack|bag|pack|sack|pouch|tote/i, '🎒'],
  [/shirt|tee\b|jersey|apparel|garment/i, '👕'],
  [/keyboard|keycap/i, '⌨️'],
  [/switch\b|switches/i, '🔘'],
  [/phone|iphone|smartphone/i, '📱'],
  [/screen|display|monitor|oled|lcd/i, '🖥️'],
  [/battery|accumulator/i, '🔋'],
  [/pcb|circuit|chip|soc\b|processor|microcontroller|logic board|substrate/i, '💻'],
  [/camera|lens|aperture/i, '📷'],
  [/speaker|audio/i, '🔊'],
  [/microphone|mic\b/i, '🎤'],
  [/cable|wire|cord|usb/i, '🔌'],
  [/motor|engine|gearbox|actuator|bearing|spring/i, '⚙️'],
  [/fan|impeller|propeller/i, '🌀'],
  [/pump|valve|pipe|tube/i, '🚰'],
  [/tank|drum|barrel|canister/i, '🛢️'],
  [/wood|timber|plank|oak|pine|birch|bamboo|hardwood|slat|dowel|blank|board|lumber|log\b/i, '🪵'],
  [/tree|forest|standing/i, '🌳'],
  [/steel|iron|aluminium|aluminum|copper|brass|metal|alloy|billet|foil|sheet|ore/i, '⛓️'],
  [/plastic|polymer|abs\b|pbt|nylon|polyester|resin|acrylic|delrin|acetal|polycarbonate/i, '🧴'],
  [/glass|silica|quartz/i, '🫙'],
  [/rubber|silicone|elastomer|foam|sponge|felt/i, '🧽'],
  [/glue|adhesive|cement|epoxy|solder|paste/i, '🧴'],
  [/paint|varnish|stain|coating|finish|anodis|powder|dye|pigment/i, '🎨'],
  [/sandpaper|abrasive|grit|polish/i, '🧽'],
  [/screw|bolt|fastener|rivet|nail|nut\b|washer/i, '🔩'],
  [/saw|blade|shear|scissor|cut/i, '🪚'],
  [/drill|bore|mill\b|cnc/i, '🛠️'],
  [/hammer|mallet/i, '🔨'],
  [/wrench|spanner|screwdriver|clamp|pliers|tool/i, '🔧'],
  [/needle|pin\b|stitch|sew/i, '🪡'],
  [/seed|sprout|seedling|germinat/i, '🌱'],
  [/wheat|grain|flour|rice|oat/i, '🌾'],
  [/leaf|herb|plant|foliage|mulch/i, '🌿'],
  [/flower|blossom/i, '🌸'],
  [/water|irrigat|rain/i, '💧'],
  [/fertilis|fertiliz|compost|nutrient|feed/i, '♻️'],
  [/land|soil|earth|ground|plot/i, '🟫'],
  [/sun|solar|daylight/i, '☀️'],
  [/heat|oven|kiln|furnace|flame|fire|reflow|dry/i, '🔥'],
  [/cold|freeze|chill|ice\b/i, '❄️'],
  [/air|wind|ventilat/i, '💨'],
  [/magnet/i, '🧲'],
  [/power|energy|electric/i, '⚡'],
  [/lock|security/i, '🔒'],
  [/key\b/i, '🔑'],
  [/radio|antenna|signal|wifi|bluetooth/i, '📡'],
  [/storage|disk|drive|ssd/i, '💾'],
  [/memory|ram\b/i, '🧠'],
  [/headphone|earphone/i, '🎧'],
  [/wallet|card|payment/i, '💳'],
  [/truck|shipping|logistic|freight/i, '🚚'],
  [/factory|manufactur|plant\b/i, '🏭'],
  [/recycl|waste/i, '♻️'],
  [/diamond|gem|crystal/i, '💎'],
  [/shield|protect|case|shell|enclosure|housing/i, '🛡️'],
  [/door|window/i, '🚪'],
  [/ruler|measure|gauge|caliper/i, '📏'],
  [/scale|weight|mass/i, '⚖️'],
  [/thermometer|temperature/i, '🌡️'],
  [/flask|chemical|acid|solvent/i, '🧪'],
  [/box|carton|package|parcel|cardboard/i, '📦'],
  [/bike|bicycle|wheel/i, '🚲'],
  [/car|vehicle/i, '🚗'],
  [/wave|ocean|sea\b/i, '🌊'],
  [/thread|yarn|cotton|wool|fabric|cloth|textile|webbing|strap|lacing/i, '🧵'],
  [/zipper|zip\b/i, '🧷'],
  [/buckle|ring|chain|hook/i, '🔗'],
  [/label|tag/i, '🏷️'],
  [/tape/i, '🩹'],
  [/paper|card\b/i, '📄'],
  [/ink|print/i, '🖋️'],
  [/oil|fuel|petrol|diesel/i, '🛢️'],
  [/sand|gravel/i, '🏖️'],
  [/stone|rock|brick|concrete|clay|ceramic/i, '🧱'],
  [/salt|sugar/i, '🧂'],
  [/egg|milk|honey|wax|soap/i, '🥚'],
  [/tomato|vegetable|fruit/i, '🍅'],
  [/time|hour|minute|labour|labor|assembly|build|cure|dry|mill|turn|sand|sew|cut|reflow|lathe/i, '⏳'],
];

export const BOX_EMOJI = '📦';

const PICTO = /\p{Extended_Pictographic}/u;
const PICTO_SEQ = /\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*/u;

/** Guarantees a single emoji glyph — any word the model returns is discarded. */
export function sanitizeEmoji(value: string | undefined, name: string, kind: NodeKind): string {
  const raw = (value ?? '').trim();
  if (raw && PICTO.test(raw)) {
    const match = raw.match(PICTO_SEQ);
    if (match) return match[0];
  }
  return emojiFor(name, kind);
}

export function emojiFor(name: string, kind: NodeKind): string {
  if (kind === 'time') return '⏳';
  for (const [pattern, emoji] of RULES) {
    if (pattern.test(name)) return emoji;
  }
  return BOX_EMOJI;
}
