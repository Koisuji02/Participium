#!/bin/bash

# Seed Database Script - Populates the database with sample reports
# This script combines all seeding operations into one convenient command

SCRIPT_DIR="$(dirname "$0")"
DB_PATH="$SCRIPT_DIR/server/participium.db"

echo "════════════════════════════════════════════════════════════"
echo "  🌱 Participium Database Seeder"
echo "════════════════════════════════════════════════════════════"
echo ""

# Check if database exists
if [[ ! -f "$DB_PATH" ]]; then
    echo "❌ Database not found at $DB_PATH"
    echo "Please run the server first to create the database."
    exit 1
fi

# Get user IDs
echo "📋 Checking for users in database..."
USER_IDS=($(sqlite3 "$DB_PATH" "SELECT id FROM users;"))

if [[ ${#USER_IDS[@]} -eq 0 ]]; then
    echo "❌ No users found in database."
    echo "Please create at least one user before seeding reports."
    exit 1
fi

echo "✅ Found ${#USER_IDS[@]} user(s)"
echo ""

# Clear existing reports
echo "🗑️  Clearing existing reports..."
sqlite3 "$DB_PATH" "DELETE FROM reports;"
echo "✅ Reports cleared"
echo ""

echo "🌱 Populating database with sample reports..."
echo ""

# Create uploads directory if it doesn't exist
UPLOADS_DIR="$SCRIPT_DIR/server/uploads/reports"
mkdir -p "$UPLOADS_DIR"

# Function to generate a random colored image
generate_random_image() {
    local filename="$1"
    local colors=("red" "blue" "green" "yellow" "purple" "orange" "pink" "cyan" "brown" "gray")
    local random_color=${colors[$((RANDOM % ${#colors[@]}))]}
    
    # Create a simple colored PNG using ImageMagick if available
    if command -v convert &> /dev/null; then
        convert -size 300x200 xc:$random_color "$filename" 2>/dev/null || {
            # Fallback: create a minimal PNG with Python if ImageMagick fails
            python3 << EOF 2>/dev/null || echo "Cannot generate image"
import struct
import zlib

# Create a minimal 2x2 PNG with random color
width, height = 300, 200
pixels = b'\xff\x00\x00' * (width * height)  # Red pixels

def create_png(filename):
    # PNG signature
    png_data = b'\x89PNG\r\n\x1a\n'
    
    # IHDR chunk (width, height, bit depth, color type, etc.)
    ihdr = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
    ihdr_crc = zlib.crc32(b'IHDR' + ihdr) & 0xffffffff
    png_data += struct.pack('>I', 13) + b'IHDR' + ihdr + struct.pack('>I', ihdr_crc)
    
    # IDAT chunk (image data)
    scanlines = b'\x00' + b'\xff\x00\x00' * width
    idat = zlib.compress(scanlines * height)
    idat_crc = zlib.crc32(b'IDAT' + idat) & 0xffffffff
    png_data += struct.pack('>I', len(idat)) + b'IDAT' + idat + struct.pack('>I', idat_crc)
    
    # IEND chunk
    iend_crc = zlib.crc32(b'IEND') & 0xffffffff
    png_data += struct.pack('>I', 0) + b'IEND' + struct.pack('>I', iend_crc)
    
    with open(filename, 'wb') as f:
        f.write(png_data)

create_png("$filename")
EOF
        }
    else
        # Fallback: create a text file that represents an image
        echo "Placeholder image for report" > "$filename"
    fi
}

# Array of reporter names for metadata
reporters=(
    "Marco Rossi, local business owner"
    "Anna Ferrari, concerned parent"
    "Giuseppe Colombo, daily commuter"
    "Laura Ricci, elderly resident"
    "Paolo Marino, wheelchair user"
    "Elena Greco, jogger and park visitor"
    "Andrea Romano, cyclist"
    "Francesca Conti, shop owner"
    "Roberto Gallo, taxi driver"
    "Silvia Costa, tourist guide"
    "Matteo Fontana, student"
    "Chiara Barbieri, dog owner"
    "Giovanni Mancini, delivery driver"
    "Sara Lombardi, new resident"
    "Luca Martini, architect"
    "Valentina Serra, nurse"
    "Davide Bruno, teacher"
    "Alessia Gatti, photographer"
    "Federico Villa, security guard"
    "Martina Rizzo, resident"
)

# Counter for report insertions
report_count=0

# Function to insert report with proper author assignment
insert_report() {
    local title="$1"
    local description="$2"
    local category="$3"
    local latitude="$4"
    local longitude="$5"
    local state="$6"
    
    # Random date within last 60 days
    local days_ago=$((RANDOM % 60))
    local date=$(date -d "$days_ago days ago" '+%Y-%m-%d %H:%M:%S' 2>/dev/null || date -v-${days_ago}d '+%Y-%m-%d %H:%M:%S')
    
    # Assign user (cycle through available users)
    local user_index=$((report_count % ${#USER_IDS[@]}))
    local author_id=${USER_IDS[$user_index]}
    
    # Random anonymity (30% chance of being anonymous)
    local anonymity=0
    local random=$((RANDOM % 10))
    if [[ $random -lt 3 ]]; then
        anonymity=1
    fi
    
    # Generate 3 photos for this report
    local photo_ids=()
    for i in {1..3}; do
        local photo_id="report_${report_count}_photo_${i}.png"
        generate_random_image "$UPLOADS_DIR/$photo_id"
        photo_ids+=("\"$photo_id\"")
    done
    local photos_json="[$(IFS=,; echo "${photo_ids[*]}")]"
    
    # Escape single quotes in description
    description=$(echo "$description" | sed "s/'/''/g")
    title=$(echo "$title" | sed "s/'/''/g")
    
    # Set reviewStatus and state based on input state parameter
    local review_status="PENDING"
    local actual_state="PENDING"
    if [[ "$state" == "APPROVED" ]]; then
        review_status="APPROVED"
        # For approved reports, randomly assign states: ASSIGNED, IN_PROGRESS, SUSPENDED, or RESOLVED
        local rand=$((RANDOM % 4))
        case $rand in
            0) actual_state="ASSIGNED" ;;
            1) actual_state="IN_PROGRESS" ;;
            2) actual_state="SUSPENDED" ;;
            3) actual_state="RESOLVED" ;;
        esac
    fi

    sqlite3 "$DB_PATH" <<EOF
INSERT INTO reports (title, location, author_id, anonymity, date, category, document, state, reason, assignedOfficerId, reviewStatus)
VALUES (
    '$title',
    '{"name":"Turin, Italy","Coordinates":{"latitude":$latitude,"longitude":$longitude}}',
    $author_id,
    $anonymity,
    '$date',
    '$category',
    '{"Description":"$description","Photos":$photos_json}',
    '$actual_state',
    NULL,
    NULL,
    '$review_status'
);
EOF
    
    ((report_count++))
    
    # Progress indicator
    if [[ $((report_count % 10)) -eq 0 ]]; then
        echo "  📝 Inserted $report_count reports..."
    fi
}

# INFRASTRUCTURE (15 reports - 2 APPROVED for every 1 PENDING)
insert_report "Pothole on Corso Vittorio Emanuele II" "Large pothole approximately 30cm deep near address 125. It's causing damage to vehicles and is a hazard for motorcycles and bicycles." "infrastructure" "45.0655" "7.6892" "APPROVED"
insert_report "Cracked pavement on Via Garibaldi" "Uneven and cracked pavement creating tripping hazard for pedestrians, especially elderly citizens. Located in front of shop number 47." "infrastructure" "45.0691" "7.6823" "APPROVED"
insert_report "Missing street sign at Via Lagrange intersection" "Street name sign has been missing for over a week, causing confusion for visitors and delivery services trying to navigate the area." "infrastructure" "45.0665" "7.6875" "PENDING"
insert_report "Damaged pedestrian crossing on Corso Francia" "White stripes of pedestrian crossing almost completely faded, making it dangerous for people crossing the busy road." "infrastructure" "45.0889" "7.6523" "APPROVED"
insert_report "Broken manhole cover on Via Po" "Manhole cover partially broken and unstable. Creates loud noise when vehicles pass over and poses risk of tire damage." "infrastructure" "45.0688" "7.6956" "APPROVED"
insert_report "Collapsed sidewalk on Corso Duca degli Abruzzi" "Section of sidewalk has collapsed near the metro entrance, forcing pedestrians to walk on the road. Urgent repair needed." "infrastructure" "45.0632" "7.6589" "PENDING"
insert_report "Water leak causing road subsidence" "Visible water leak from underground pipe causing road surface to sink on Via Nizza. Growing larger every day." "infrastructure" "45.0521" "7.6712" "APPROVED"
insert_report "Damaged guardrail on Corso Regina Margherita" "Metal guardrail bent and broken, likely from vehicle collision. Safety hazard for both vehicles and pedestrians." "infrastructure" "45.0856" "7.6834" "APPROVED"
insert_report "Loose cobblestones in historic center" "Multiple cobblestones loose on Via Stampatori, creating uneven surface dangerous for pedestrians, especially in wet conditions." "infrastructure" "45.0698" "7.6878" "PENDING"
insert_report "Broken drainage grate on Piazza Vittorio Veneto" "Drainage grate broken and partially missing, creating hole that could trap bicycle wheels or cause pedestrian injuries." "infrastructure" "45.0625" "7.6978" "APPROVED"
insert_report "Damaged road surface on Corso Giulio Cesare" "Multiple potholes and cracks making the road difficult and dangerous for all vehicles, particularly two-wheelers." "infrastructure" "45.0823" "7.6712" "APPROVED"
insert_report "Broken curb creating water pooling" "Damaged curb preventing proper drainage, causing large puddles to form during rain. Pedestrians forced to walk in road." "infrastructure" "45.0567" "7.6834" "PENDING"
insert_report "Unstable paving stones in piazza" "Several large paving stones loose and wobbly in Piazza Solferino, creating tripping hazard." "infrastructure" "45.0689" "7.6801" "APPROVED"
insert_report "Sinking road section near bridge" "Road surface sinking near Ponte Vittorio Emanuele I, likely due to underground erosion. Needs urgent inspection." "infrastructure" "45.0634" "7.6945" "APPROVED"
insert_report "Broken access ramp for disabled" "Wheelchair ramp cracked and broken at public building entrance, making access impossible for disabled users." "infrastructure" "45.0712" "7.6867" "PENDING"

# ENVIRONMENT (15 reports)
insert_report "Damaged park bench in Parco del Valentino" "Wooden bench near the entrance has several broken slats making it unusable and potentially dangerous. Popular sitting area for families." "environment" "45.0585" "7.6847" "APPROVED"
insert_report "Dead tree in residential area" "Large dead tree on Corso Regina Margherita poses risk of falling branches. Located near playground area, immediate inspection recommended." "environment" "45.0823" "7.6912" "APPROVED"
insert_report "Broken fountain in Piazza CLN" "Historic fountain not functioning, water basin empty and collecting debris. Important landmark requiring maintenance." "environment" "45.0642" "7.6695" "PENDING"
insert_report "Overgrown vegetation blocking pathway" "Bushes and trees overgrown along pedestrian path in Parco della Pellerina, making passage difficult and unsafe." "environment" "45.0945" "7.6456" "APPROVED"
insert_report "Damaged playground equipment" "Swing set in Giardini Cavour has broken chains and damaged seats. Popular playground needs urgent safety check." "environment" "45.0756" "7.6712" "APPROVED"
insert_report "Abandoned waste in park area" "Large pile of construction debris dumped illegally in wooded area of Parco del Valentino. Environmental hazard." "environment" "45.0512" "7.6823" "PENDING"
insert_report "Dried up pond in Botanical Garden" "Decorative pond completely dried up with dead fish visible. Unpleasant smell affecting visitor experience." "environment" "45.0598" "7.6734" "APPROVED"
insert_report "Broken public exercise equipment" "Outdoor gym equipment in park has broken resistance mechanism. Could cause injuries if used." "environment" "45.0867" "7.6645" "APPROVED"
insert_report "Fallen tree blocking park path" "Large tree fallen across main walking path after recent storm. Completely blocks access to picnic area." "environment" "45.0534" "7.6889" "PENDING"
insert_report "Dog waste bins overflowing" "All dog waste bins in Giardini Reali completely full and overflowing. Creating unsanitary conditions." "environment" "45.0734" "7.6867" "APPROVED"
insert_report "Broken picnic table in park" "Wooden picnic table collapsed, creating hazard. Very popular spot for families needs replacement." "environment" "45.0601" "7.6789" "APPROVED"
insert_report "Invasive plants damaging pathway" "Roots from invasive plant species breaking through asphalt path, creating trip hazards." "environment" "45.0923" "7.6523" "PENDING"
insert_report "Vandalized park signage" "Information signs about park flora and fauna destroyed by vandals. Educational value lost." "environment" "45.0578" "7.6801" "APPROVED"
insert_report "Broken irrigation system" "Sprinklers in public garden broken and flooding pathway. Water waste and slipping hazard." "environment" "45.0789" "7.6678" "APPROVED"
insert_report "Damaged bird nesting boxes" "Several nesting boxes damaged or fallen from trees. Important for urban wildlife conservation." "environment" "45.0623" "7.6845" "PENDING"

# SAFETY (15 reports)
insert_report "Broken streetlight on Via Roma" "The streetlight near the corner of Via Roma and Piazza San Carlo has been out for three days, creating safety concerns for pedestrians at night." "safety" "45.0678" "7.6847" "APPROVED"
insert_report "Flickering streetlights on Corso Duca degli Abruzzi" "Multiple streetlights flickering intermittently along the corso, creating inadequate lighting conditions. Possibly electrical issue affecting several poles." "safety" "45.0628" "7.6623" "APPROVED"
insert_report "Broken railing on pedestrian bridge" "Metal railing on footbridge over railway missing section. Serious fall hazard, especially for children." "safety" "45.0712" "7.6556" "PENDING"
insert_report "Exposed electrical wires on building facade" "Electrical wires hanging loose from building wall at low height. Serious electrocution risk after rain." "safety" "45.0701" "7.6789" "APPROVED"
insert_report "Missing safety barrier near construction site" "Construction area on Via San Francesco not properly fenced. Easy access for children, multiple hazards visible." "safety" "45.0667" "7.6834" "APPROVED"
insert_report "Dark tunnel under railway" "All lights out in pedestrian underpass. Completely dark even during day, safety concern for vulnerable users." "safety" "45.0589" "7.6567" "PENDING"
insert_report "Broken glass on children's playground" "Shattered glass bottle scattered across playground sand area. Immediate cleanup required to prevent injuries." "safety" "45.0778" "7.6701" "APPROVED"
insert_report "Unstable scaffolding on historic building" "Construction scaffolding appears unstable and poorly secured. Located on busy pedestrian street, serious public safety risk." "safety" "45.0689" "7.6845" "APPROVED"
insert_report "Ice accumulation on sidewalk" "Large patch of ice on sidewalk not treated with salt. Multiple people have slipped, needs immediate attention." "safety" "45.0812" "7.6723" "PENDING"
insert_report "Broken fire hydrant leaking water" "Fire hydrant damaged and continuously leaking water onto sidewalk, creating slipping hazard and water waste." "safety" "45.0645" "7.6912" "APPROVED"
insert_report "Missing reflective road markers" "Reflective markers on sharp curve completely missing. Very dangerous at night for motorists." "safety" "45.0534" "7.6634" "APPROVED"
insert_report "Broken emergency exit light" "Emergency exit lighting in underground parking not working. Safety code violation." "safety" "45.0698" "7.6756" "PENDING"
insert_report "Sharp metal protruding from wall" "Broken metal fixture sticking out from wall at head height on narrow sidewalk. Injury risk." "safety" "45.0656" "7.6812" "APPROVED"
insert_report "Unsafe temporary barriers around sinkhole" "Plastic barriers inadequate for large sinkhole. Risk of vehicles or people falling in." "safety" "45.0723" "7.6589" "APPROVED"
insert_report "No warning signs near icy steps" "Steep stairs frequently icy with no warning signs or salt treatment. Multiple falls reported." "safety" "45.0801" "7.6701" "PENDING"

# SANITATION (15 reports)
insert_report "Overflowing trash bin on Piazza Castello" "Public waste bin has been overflowing for two days, causing litter to scatter around the area. Located near the main tourist entrance." "sanitation" "45.0725" "7.6868" "APPROVED"
insert_report "Graffiti on historic building facade" "Vandalism graffiti covering approximately 10 square meters on the facade of a historic building on Via Po. Requires urgent cleaning to preserve the architectural heritage." "sanitation" "45.0676" "7.6912" "APPROVED"
insert_report "Illegal dumping of furniture" "Old mattress, sofa and other furniture dumped on street corner. Been there for over a week attracting rats." "sanitation" "45.0623" "7.6745" "PENDING"
insert_report "Sewage smell from storm drain" "Strong sewage odor coming from storm drain on Via Pietro Micca. Smell has intensified over past few days." "sanitation" "45.0703" "7.6823" "APPROVED"
insert_report "Broken public restroom facility" "Public toilet in Giardini Reali out of order for two weeks. Door broken, unsanitary conditions inside." "sanitation" "45.0741" "7.6856" "APPROVED"
insert_report "Overflowing recycling containers" "All recycling bins on Corso Vinzaglio completely full. Cardboard and plastic scattered around by wind." "sanitation" "45.0689" "7.6712" "PENDING"
insert_report "Rat infestation near market area" "Multiple rats visible during daytime near Porta Palazzo market. Waste accumulation seems to be attracting them." "sanitation" "45.0778" "7.6823" "APPROVED"
insert_report "Abandoned vehicle leaking fluids" "Car abandoned for months now leaking oil onto street. Creating environmental hazard and ugly stain." "sanitation" "45.0567" "7.6678" "APPROVED"
insert_report "Pigeon droppings on public benches" "Benches in Piazza San Carlo covered in pigeon droppings. Completely unusable and unsanitary." "sanitation" "45.0689" "7.6834" "PENDING"
insert_report "Graffiti on metro station entrance" "Extensive graffiti vandalism covering entire wall of metro entrance. Makes area look neglected and unsafe." "sanitation" "45.0612" "7.6598" "APPROVED"
insert_report "Overflowing dumpsters behind restaurant" "Commercial dumpsters overflowing, attracting vermin and creating terrible smell for nearby residents." "sanitation" "45.0656" "7.6789" "APPROVED"
insert_report "Fly-tipping of construction waste" "Large amount of construction debris illegally dumped in residential street. Blocking part of roadway." "sanitation" "45.0734" "7.6645" "PENDING"
insert_report "Dead animal on roadside" "Dead animal (appears to be cat) on side of road for several days. Needs removal for hygiene reasons." "sanitation" "45.0589" "7.6712" "APPROVED"
insert_report "Broken glass recycling bin" "Glass recycling container damaged, broken glass scattered on ground. Dangerous and unsightly." "sanitation" "45.0801" "7.6756" "APPROVED"
insert_report "Uncontrolled vegetation growth on building" "Abandoned building covered in invasive vegetation. Affecting neighboring properties and attracting pests." "sanitation" "45.0623" "7.6823" "PENDING"

# TRANSPORT (15 reports)
insert_report "Malfunctioning traffic light at Piazza Statuto" "Traffic light at the intersection is stuck on red in all directions, causing traffic congestion. Urgent intervention needed for traffic safety." "transport" "45.0712" "7.6745" "APPROVED"
insert_report "Damaged bike lane marking" "Bike lane road markings severely faded and barely visible on Via Nizza, creating safety concerns for cyclists and motorists." "transport" "45.0556" "7.6734" "APPROVED"
insert_report "Bus stop shelter damaged" "Glass panels of bus shelter shattered on Corso Vittorio. Sharp glass pieces pose danger to waiting passengers." "transport" "45.0667" "7.6867" "PENDING"
insert_report "Missing electronic bus schedule display" "Digital display at busy bus stop not working for two weeks. Passengers have no information about arrivals." "transport" "45.0734" "7.6789" "APPROVED"
insert_report "Bicycle parking rack broken" "Bike rack near metro station broken and bent. Only 2 of 10 spaces usable, causing bikes to be locked to trees." "transport" "45.0623" "7.6601" "APPROVED"
insert_report "Road signs obscured by tree branches" "Multiple important road signs completely hidden by overgrown tree branches on Corso Regina Margherita." "transport" "45.0889" "7.6756" "PENDING"
insert_report "Parking meter not accepting payment" "Parking meter on Via Carlo Alberto refuses all payment methods. Causing confusion and unfair parking tickets." "transport" "45.0656" "7.6923" "APPROVED"
insert_report "Zebra crossing paint completely worn" "Pedestrian crossing near school completely invisible. Very dangerous for children crossing busy street." "transport" "45.0745" "7.6645" "APPROVED"
insert_report "Bus shelter bench broken" "Seating at bus stop collapsed and broken. Elderly passengers have nowhere to sit while waiting." "transport" "45.0598" "7.6712" "PENDING"
insert_report "Speed limit sign knocked down" "Speed limit sign lying on ground after apparent vehicle collision. Needs replacement for traffic safety." "transport" "45.0812" "7.6534" "APPROVED"
insert_report "Missing bike lane segment" "Bike lane abruptly ends forcing cyclists into heavy traffic. Dangerous gap needs to be connected." "transport" "45.0634" "7.6678" "APPROVED"
insert_report "Faded road line markings" "Lane markings and turn arrows completely faded at busy intersection. Causing confusion and near-accidents." "transport" "45.0689" "7.6812" "PENDING"
insert_report "Broken bus shelter roof" "Roof of bus shelter partially collapsed. Passengers getting wet when raining, glass pieces on ground." "transport" "45.0756" "7.6723" "APPROVED"
insert_report "Blocked bike path by parked cars" "Cars regularly parking across dedicated bike path. Cyclists forced into traffic or onto sidewalk." "transport" "45.0601" "7.6789" "APPROVED"
insert_report "Disabled parking space misused" "Disabled parking bay being used by non-disabled vehicles. No enforcement observed." "transport" "45.0678" "7.6834" "PENDING"

# OTHER (10 reports)
insert_report "Public WiFi not working in piazza" "Free public WiFi service advertised in Piazza Castello not functioning. Multiple users unable to connect." "other" "45.0721" "7.6872" "APPROVED"
insert_report "Noisy construction starting too early" "Construction site on Via Lagrange starting work at 6 AM, violating noise ordinance. Disturbing entire neighborhood." "other" "45.0663" "7.6881" "APPROVED"
insert_report "Public clock tower showing wrong time" "Historic clock tower in piazza showing incorrect time for over a month. Tourist landmark needs maintenance." "other" "45.0695" "7.6845" "PENDING"
insert_report "Stray dogs in residential area" "Pack of three stray dogs roaming residential streets. Concerned about safety, especially for children and elderly." "other" "45.0534" "7.6623" "APPROVED"
insert_report "Missing manhole cover in pedestrian area" "Manhole cover completely missing leaving dangerous open hole on busy pedestrian walkway. Immediate action required." "other" "45.0678" "7.6789" "APPROVED"
insert_report "Loud noise from industrial facility" "Factory on Via Cigna creating excessive noise at night. Violating residential area noise limits." "other" "45.0812" "7.6612" "PENDING"
insert_report "Broken public water fountain" "Drinking fountain in park not working. Important facility during summer heat waves." "other" "45.0645" "7.6756" "APPROVED"
insert_report "Illegal street vendor blocking sidewalk" "Unauthorized vendor completely blocking narrow sidewalk. Pedestrians forced to walk in road." "other" "45.0723" "7.6823" "APPROVED"
insert_report "Abandoned shopping cart in river" "Shopping cart dumped in Po river near embankment. Environmental pollution and eyesore." "other" "45.0598" "7.6934" "PENDING"
insert_report "Broken public announcement speaker" "Emergency announcement system in piazza not working. Important for public safety communications." "other" "45.0689" "7.6801" "APPROVED"

# ADDITIONAL APPROVED REPORTS TO REACH 100 (43 more reports)

# More Infrastructure (10 reports)
insert_report "Crumbling retaining wall on hillside road" "Retaining wall showing signs of structural failure with visible cracks. Risk of collapse onto road below." "infrastructure" "45.0612" "7.6756" "APPROVED"
insert_report "Flooded pedestrian underpass" "Underground passage floods during rain due to blocked drainage. Water can reach knee-height." "infrastructure" "45.0778" "7.6634" "APPROVED"
insert_report "Broken tactile paving for blind pedestrians" "Textured paving tiles for visually impaired missing or damaged at major crossing point." "infrastructure" "45.0701" "7.6812" "APPROVED"
insert_report "Subsidence creating large crack in road" "Growing crack across entire width of roadway. Appears to be foundation problem." "infrastructure" "45.0556" "7.6689" "APPROVED"
insert_report "Damaged bridge expansion joint" "Metal expansion joint on bridge damaged and noisy. Creating hazard for motorcycles." "infrastructure" "45.0634" "7.6923" "APPROVED"
insert_report "Broken curb ramp at intersection" "ADA-compliant ramp crumbled and unusable. Wheelchair users cannot access crosswalk." "infrastructure" "45.0689" "7.6745" "APPROVED"
insert_report "Sinkhole forming in parking lot" "Depression forming in public parking area. Getting larger and may become dangerous." "infrastructure" "45.0723" "7.6801" "APPROVED"
insert_report "Eroded embankment near river path" "Riverbank erosion threatening pedestrian path. Section may collapse into water." "infrastructure" "45.0567" "7.6945" "APPROVED"
insert_report "Broken storm water grating" "Large drainage cover collapsed into drain. Dangerous opening in street." "infrastructure" "45.0801" "7.6678" "APPROVED"
insert_report "Damaged accessibility lift at station" "Elevator for disabled access broken for weeks. Only stairs available." "infrastructure" "45.0645" "7.6589" "APPROVED"

# More Environment (10 reports)
insert_report "Algae bloom in decorative pond" "Public pond covered in toxic-looking algae. Smells bad and may be health hazard." "environment" "45.0612" "7.6834" "APPROVED"
insert_report "Diseased trees spreading infection" "Multiple trees showing signs of disease. May spread to healthy trees if not treated." "environment" "45.0745" "7.6712" "APPROVED"
insert_report "Erosion exposing tree roots on path" "Popular walking path eroded, exposing large tree roots. Major tripping hazard." "environment" "45.0534" "7.6801" "APPROVED"
insert_report "Broken fence around pond" "Protective fencing around deep pond has gaps. Safety risk for children." "environment" "45.0667" "7.6923" "APPROVED"
insert_report "Abandoned beehive in playground" "Large wasp or bee nest in children's play area. Stinging incidents reported." "environment" "45.0789" "7.6645" "APPROVED"
insert_report "Invasive species taking over park" "Non-native plants choking out indigenous flora. Destroying local ecosystem." "environment" "45.0601" "7.6756" "APPROVED"
insert_report "Damaged rain shelter in park" "Covered seating area roof damaged and leaking. No dry place to sit during rain." "environment" "45.0856" "7.6689" "APPROVED"
insert_report "Fallen branches blocking jogging path" "Large tree limbs across running path after windstorm. Completely impassable." "environment" "45.0523" "7.6834" "APPROVED"
insert_report "Public garden completely overgrown" "Community garden abandoned and overgrown. Attracting rodents and insects." "environment" "45.0734" "7.6778" "APPROVED"
insert_report "Broken water feature creating mosquito breeding" "Non-functioning fountain collecting stagnant water. Perfect mosquito habitat." "environment" "45.0678" "7.6612" "APPROVED"

# More Safety (8 reports)
insert_report "Missing guardrail on elevated walkway" "Protective barrier missing on raised pedestrian bridge. Serious fall risk." "safety" "45.0623" "7.6701" "APPROVED"
insert_report "Electrical box door hanging open" "Utility box with exposed wiring open and accessible. Electrocution hazard." "safety" "45.0756" "7.6823" "APPROVED"
insert_report "Broken safety mirror at blind corner" "Traffic mirror shattered at dangerous intersection. Cannot see oncoming vehicles." "safety" "45.0689" "7.6656" "APPROVED"
insert_report "Sharp metal edges on playground equipment" "Rusted equipment with exposed sharp metal edges. Cut hazard for children." "safety" "45.0812" "7.6745" "APPROVED"
insert_report "Unstable retaining wall above sidewalk" "Wall showing signs of imminent collapse. Could fall on pedestrians below." "safety" "45.0567" "7.6878" "APPROVED"
insert_report "Broken security lighting in parking garage" "Underground parking completely dark at night. Safety concern for users." "safety" "45.0701" "7.6589" "APPROVED"
insert_report "Missing manhole cover on busy street" "Open manhole without cover or warning signs. Extreme danger to all traffic." "safety" "45.0634" "7.6812" "APPROVED"
insert_report "Loose paving slabs near school entrance" "Multiple wobbly paving stones at school gate. Children tripping regularly." "safety" "45.0778" "7.6667" "APPROVED"

# More Sanitation (8 reports)
insert_report "Blocked drain causing standing water" "Storm drain completely clogged. Large puddle becoming breeding ground for insects." "sanitation" "45.0645" "7.6723" "APPROVED"
insert_report "Overflowing septic smell from manhole" "Sewage odor emanating from street drainage. Getting worse daily." "sanitation" "45.0723" "7.6656" "APPROVED"
insert_report "Illegal tire dumping site" "Dozens of old tires dumped in wooded area. Environmental and fire hazard." "sanitation" "45.0534" "7.6745" "APPROVED"
insert_report "Broken compactor at waste station" "Public recycling compactor broken and overflowing. Waste piling up everywhere." "sanitation" "45.0801" "7.6789" "APPROVED"
insert_report "Contaminated soil from oil spill" "Large oil stain on ground near abandoned garage. Contaminating soil and groundwater." "sanitation" "45.0612" "7.6834" "APPROVED"
insert_report "Mold growing on damp public building wall" "Exterior wall of community center covered in black mold. Health concern." "sanitation" "45.0689" "7.6601" "APPROVED"
insert_report "Dumped chemical containers in park" "Unmarked containers with unknown liquids dumped near playground. Hazardous waste." "sanitation" "45.0756" "7.6712" "APPROVED"
insert_report "Broken outdoor dining waste bins" "Restaurant area garbage containers damaged. Waste attracting animals and pests." "sanitation" "45.0667" "7.6778" "APPROVED"

# More Transport (7 reports)
insert_report "Faded no parking zone markings" "Yellow lines completely invisible. Causing confusion and blocking emergency access." "transport" "45.0634" "7.6845" "APPROVED"
insert_report "Broken bike share docking station" "Public bicycle station not functioning. Bikes cannot be rented or returned." "transport" "45.0712" "7.6623" "APPROVED"
insert_report "Missing pedestrian push button at crossing" "Traffic light button broken. Pedestrians unable to activate crossing signal." "transport" "45.0778" "7.6756" "APPROVED"
insert_report "Pothole damaging vehicles on main road" "Deep pothole on major route causing tire damage. Multiple complaints from drivers." "transport" "45.0589" "7.6812" "APPROVED"
insert_report "Unclear road markings at roundabout" "Lane markings faded at busy traffic circle. Causing near-miss accidents." "transport" "45.0856" "7.6689" "APPROVED"
insert_report "Damaged tram stop platform" "Platform edge crumbling at tram station. Gap hazard when boarding." "transport" "45.0645" "7.6734" "APPROVED"
insert_report "Broken directional signage" "Major road sign bent and pointing wrong direction. Confusing for navigation." "transport" "45.0701" "7.6867" "APPROVED"

echo ""
echo "✅ All reports inserted successfully!"
echo ""
echo "════════════════════════════════════════════════════════════"
echo "  📊 Database Summary"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "Reports by state:"
sqlite3 "$DB_PATH" "SELECT state, COUNT(*) as count FROM reports GROUP BY state;" | while read line; do
    echo "  $line"
done
echo ""
echo "Reports by category:"
sqlite3 "$DB_PATH" "SELECT category, COUNT(*) as count FROM reports GROUP BY category ORDER BY count DESC;" | while read line; do
    echo "  $line"
done
echo ""
echo "Total reports: $report_count"
echo ""
echo "════════════════════════════════════════════════════════════"
echo "  ✅ Database seeding complete!"
echo "════════════════════════════════════════════════════════════"
