/**
 * NCERT Class 10 Static Data
 * ─────────────────────────────────────────────────────────────────────
 * Chapter lists, formula cards, PYQ year labels, and keyword mappings
 * for auto-categorizing questions from Firestore.
 * Zero Firestore reads — pure constants.
 */

// ── PYQ Year Labels ──────────────────────────────────────────────────
export const PYQ_YEARS = [2025, 2024, 2023, 2022, 2021, 2020, 2019] as const;
export type PYQYear = typeof PYQ_YEARS[number];

// ── Maths Chapters (NCERT Class 10) ─────────────────────────────────
export interface ChapterInfo {
    number: number;
    name: string;
    shortName: string;
    /** Keywords to match question text for auto-categorization */
    keywords: string[];
    /** CBSE board weightage (marks out of 80) */
    weightage: number;
    /** Whether this chapter has significant numerical problems */
    hasNumericals: boolean;
    emoji: string;
}

export const MATHS_CHAPTERS: ChapterInfo[] = [
    {
        number: 1,
        name: 'Real Numbers',
        shortName: 'Real Numbers',
        keywords: ['real number', 'hcf', 'lcm', 'euclid', 'irrational', 'rational', 'prime factorization', 'fundamental theorem', 'divisibility'],
        weightage: 6,
        hasNumericals: true,
        emoji: '🔢',
    },
    {
        number: 2,
        name: 'Polynomials',
        shortName: 'Polynomials',
        keywords: ['polynomial', 'zeroes', 'zeros', 'quadratic polynomial', 'coefficient', 'degree', 'linear polynomial', 'cubic polynomial', 'sum of zeroes', 'product of zeroes'],
        weightage: 7,
        hasNumericals: true,
        emoji: '📐',
    },
    {
        number: 3,
        name: 'Pair of Linear Equations in Two Variables',
        shortName: 'Linear Equations',
        keywords: ['linear equation', 'two variables', 'substitution', 'elimination', 'cross multiplication', 'consistent', 'inconsistent', 'pair of linear', 'graphical method', 'simultaneous'],
        weightage: 8,
        hasNumericals: true,
        emoji: '📊',
    },
    {
        number: 4,
        name: 'Quadratic Equations',
        shortName: 'Quadratic Eq.',
        keywords: ['quadratic equation', 'discriminant', 'roots', 'nature of roots', 'quadratic formula', 'factorisation', 'factorization', 'completing the square', 'b²-4ac', 'b2-4ac'],
        weightage: 8,
        hasNumericals: true,
        emoji: '✏️',
    },
    {
        number: 5,
        name: 'Arithmetic Progressions',
        shortName: 'AP',
        keywords: ['arithmetic progression', 'common difference', 'nth term', 'sum of n terms', 'a.p.', 'ap ', 'first term', 'last term', 'arithmetic sequence'],
        weightage: 8,
        hasNumericals: true,
        emoji: '🔗',
    },
    {
        number: 6,
        name: 'Triangles',
        shortName: 'Triangles',
        keywords: ['triangle', 'similar', 'congruent', 'pythagoras', 'bpt', 'basic proportionality', 'thales', 'mid-point', 'altitude', 'median', 'similarity'],
        weightage: 8,
        hasNumericals: true,
        emoji: '🔺',
    },
    {
        number: 7,
        name: 'Coordinate Geometry',
        shortName: 'Coord. Geo.',
        keywords: ['coordinate', 'distance formula', 'section formula', 'mid point', 'midpoint', 'centroid', 'area of triangle', 'collinear', 'x-axis', 'y-axis', 'origin'],
        weightage: 6,
        hasNumericals: true,
        emoji: '📍',
    },
    {
        number: 8,
        name: 'Introduction to Trigonometry',
        shortName: 'Trigonometry',
        keywords: ['trigonometry', 'sin', 'cos', 'tan', 'cosec', 'sec', 'cot', 'trigonometric ratio', 'trigonometric identity', 'complementary angle', 'sin²', 'cos²'],
        weightage: 8,
        hasNumericals: true,
        emoji: '📏',
    },
    {
        number: 9,
        name: 'Some Applications of Trigonometry',
        shortName: 'Trig. Applications',
        keywords: ['height and distance', 'angle of elevation', 'angle of depression', 'shadow', 'tower', 'building', 'lighthouse', 'application of trigonometry', 'line of sight'],
        weightage: 8,
        hasNumericals: true,
        emoji: '🏗️',
    },
    {
        number: 10,
        name: 'Circles',
        shortName: 'Circles',
        keywords: ['circle', 'tangent', 'secant', 'chord', 'radius', 'diameter', 'concentric', 'point of contact', 'tangent to a circle', 'external point'],
        weightage: 4,
        hasNumericals: true,
        emoji: '⭕',
    },
    {
        number: 11,
        name: 'Areas Related to Circles',
        shortName: 'Areas (Circles)',
        keywords: ['area of circle', 'perimeter', 'circumference', 'sector', 'segment', 'arc', 'area of sector', 'area of segment', 'quadrant', 'semicircle'],
        weightage: 4,
        hasNumericals: true,
        emoji: '🟡',
    },
    {
        number: 12,
        name: 'Surface Areas and Volumes',
        shortName: 'SA & Volumes',
        keywords: ['surface area', 'volume', 'cylinder', 'cone', 'sphere', 'hemisphere', 'frustum', 'cuboid', 'cube', 'combination of solids', 'melted', 'converted'],
        weightage: 6,
        hasNumericals: true,
        emoji: '📦',
    },
    {
        number: 13,
        name: 'Statistics',
        shortName: 'Statistics',
        keywords: ['mean', 'median', 'mode', 'frequency', 'cumulative frequency', 'ogive', 'class interval', 'grouped data', 'ungrouped data', 'histogram'],
        weightage: 5,
        hasNumericals: true,
        emoji: '📈',
    },
    {
        number: 14,
        name: 'Probability',
        shortName: 'Probability',
        keywords: ['probability', 'equally likely', 'favourable outcome', 'sample space', 'event', 'dice', 'coin', 'card', 'random', 'experiment'],
        weightage: 4,
        hasNumericals: true,
        emoji: '🎲',
    },
];

// ── Science Chapters (NCERT Class 10) ───────────────────────────────
export const SCIENCE_CHAPTERS: ChapterInfo[] = [
    {
        number: 1,
        name: 'Chemical Reactions and Equations',
        shortName: 'Chemical Reactions',
        keywords: ['chemical reaction', 'equation', 'balanced', 'reactant', 'product', 'decomposition', 'displacement', 'combination', 'oxidation', 'reduction', 'corrosion', 'rancidity'],
        weightage: 5,
        hasNumericals: false,
        emoji: '⚗️',
    },
    {
        number: 2,
        name: 'Acids, Bases and Salts',
        shortName: 'Acids & Bases',
        keywords: ['acid', 'base', 'salt', 'ph', 'indicator', 'litmus', 'neutralisation', 'neutralization', 'baking soda', 'bleaching powder', 'plaster of paris'],
        weightage: 5,
        hasNumericals: false,
        emoji: '🧪',
    },
    {
        number: 3,
        name: 'Metals and Non-metals',
        shortName: 'Metals',
        keywords: ['metal', 'non-metal', 'metallurgy', 'alloy', 'corrosion', 'reactivity series', 'ionic bond', 'extraction', 'ore', 'mineral'],
        weightage: 5,
        hasNumericals: false,
        emoji: '🔩',
    },
    {
        number: 4,
        name: 'Carbon and its Compounds',
        shortName: 'Carbon',
        keywords: ['carbon', 'organic', 'covalent bond', 'hydrocarbon', 'methane', 'ethanol', 'ethanoic acid', 'soap', 'detergent', 'functional group', 'homologous series'],
        weightage: 5,
        hasNumericals: false,
        emoji: '💎',
    },
    {
        number: 5,
        name: 'Life Processes',
        shortName: 'Life Processes',
        keywords: ['nutrition', 'respiration', 'transportation', 'excretion', 'photosynthesis', 'digestion', 'heart', 'kidney', 'lungs', 'blood', 'stomata'],
        weightage: 5,
        hasNumericals: false,
        emoji: '🌱',
    },
    {
        number: 6,
        name: 'Control and Coordination',
        shortName: 'Control & Coord.',
        keywords: ['nervous system', 'hormone', 'brain', 'spinal cord', 'reflex', 'synapse', 'endocrine', 'pituitary', 'thyroid', 'adrenaline', 'insulin', 'stimulus'],
        weightage: 4,
        hasNumericals: false,
        emoji: '🧠',
    },
    {
        number: 7,
        name: 'How Do Organisms Reproduce?',
        shortName: 'Reproduction',
        keywords: ['reproduction', 'asexual', 'sexual', 'fission', 'budding', 'fragmentation', 'pollination', 'fertilisation', 'fertilization', 'zygote', 'embryo', 'menstruation'],
        weightage: 4,
        hasNumericals: false,
        emoji: '🧬',
    },
    {
        number: 8,
        name: 'Heredity and Evolution',
        shortName: 'Heredity',
        keywords: ['heredity', 'evolution', 'gene', 'dna', 'trait', 'mendel', 'dominant', 'recessive', 'natural selection', 'speciation', 'variation', 'fossil'],
        weightage: 4,
        hasNumericals: false,
        emoji: '🔬',
    },
    {
        number: 9,
        name: 'Light — Reflection and Refraction',
        shortName: 'Light',
        keywords: ['light', 'reflection', 'refraction', 'mirror', 'lens', 'focal length', 'concave', 'convex', 'snell', 'refractive index', 'image', 'magnification', 'mirror formula'],
        weightage: 6,
        hasNumericals: true,
        emoji: '💡',
    },
    {
        number: 10,
        name: 'The Human Eye and the Colourful World',
        shortName: 'Human Eye',
        keywords: ['human eye', 'accommodation', 'myopia', 'hypermetropia', 'presbyopia', 'prism', 'dispersion', 'rainbow', 'scattering', 'tyndall', 'atmospheric refraction'],
        weightage: 3,
        hasNumericals: false,
        emoji: '👁️',
    },
    {
        number: 11,
        name: 'Electricity',
        shortName: 'Electricity',
        keywords: ['electricity', 'current', 'voltage', 'resistance', 'ohm', 'circuit', 'series', 'parallel', 'resistor', 'ammeter', 'voltmeter', 'power', 'watt', 'joule', 'heating effect'],
        weightage: 7,
        hasNumericals: true,
        emoji: '⚡',
    },
    {
        number: 12,
        name: 'Magnetic Effects of Electric Current',
        shortName: 'Magnetism',
        keywords: ['magnetic', 'electromagnet', 'solenoid', 'fleming', 'electric motor', 'generator', 'electromagnetic induction', 'galvanometer', 'fuse', 'direct current', 'alternating current'],
        weightage: 4,
        hasNumericals: true,
        emoji: '🧲',
    },
    {
        number: 13,
        name: 'Our Environment',
        shortName: 'Environment',
        keywords: ['environment', 'ecosystem', 'food chain', 'food web', 'biodegradable', 'non-biodegradable', 'ozone', 'trophic level', 'producer', 'consumer', 'decomposer'],
        weightage: 3,
        hasNumericals: false,
        emoji: '🌍',
    },
];

// ── Formula Cards (Maths — Key Formulas per Chapter) ────────────────
export interface FormulaCard {
    chapter: string;
    chapterNumber: number;
    title: string;
    formulas: string[];
    emoji: string;
}

export const MATHS_FORMULA_CARDS: FormulaCard[] = [
    {
        chapter: 'Real Numbers',
        chapterNumber: 1,
        title: 'HCF & LCM',
        emoji: '🔢',
        formulas: [
            'HCF × LCM = Product of two numbers',
            'HCF(a,b) × LCM(a,b) = a × b',
            'Every composite number can be expressed as a product of primes (Fundamental Theorem)',
            'If p divides a², then p divides a (p is prime)',
        ],
    },
    {
        chapter: 'Polynomials',
        chapterNumber: 2,
        title: 'Zeroes Relations',
        emoji: '📐',
        formulas: [
            'Sum of zeroes (α+β) = −b/a',
            'Product of zeroes (αβ) = c/a',
            'Quadratic: ax² + bx + c, a ≠ 0',
            'Cubic: Sum = −b/a, Sum(pair) = c/a, Product = −d/a',
        ],
    },
    {
        chapter: 'Linear Equations',
        chapterNumber: 3,
        title: 'Consistency Conditions',
        emoji: '📊',
        formulas: [
            'Unique solution: a₁/a₂ ≠ b₁/b₂',
            'Infinite solutions: a₁/a₂ = b₁/b₂ = c₁/c₂',
            'No solution: a₁/a₂ = b₁/b₂ ≠ c₁/c₂',
            'Methods: Substitution, Elimination, Cross-multiplication',
        ],
    },
    {
        chapter: 'Quadratic Equations',
        chapterNumber: 4,
        title: 'Roots & Discriminant',
        emoji: '✏️',
        formulas: [
            'x = (−b ± √(b²−4ac)) / 2a',
            'D = b² − 4ac (discriminant)',
            'D > 0 → Two distinct real roots',
            'D = 0 → Two equal real roots',
            'D < 0 → No real roots',
        ],
    },
    {
        chapter: 'Arithmetic Progressions',
        chapterNumber: 5,
        title: 'AP Formulas',
        emoji: '🔗',
        formulas: [
            'nth term: aₙ = a + (n−1)d',
            'Sum of n terms: Sₙ = n/2 [2a + (n−1)d]',
            'Sₙ = n/2 [a + l] where l = last term',
            'Common difference: d = a₂ − a₁',
        ],
    },
    {
        chapter: 'Triangles',
        chapterNumber: 6,
        title: 'Similarity & BPT',
        emoji: '🔺',
        formulas: [
            'BPT: If DE ∥ BC, then AD/DB = AE/EC',
            'AAA, AA, SSS, SAS similarity criteria',
            'Pythagoras: Hyp² = Base² + Perp²',
            'Ratio of areas = (ratio of sides)²',
        ],
    },
    {
        chapter: 'Coordinate Geometry',
        chapterNumber: 7,
        title: 'Distance & Section',
        emoji: '📍',
        formulas: [
            'Distance = √[(x₂−x₁)² + (y₂−y₁)²]',
            'Section formula: ((m₁x₂+m₂x₁)/(m₁+m₂), (m₁y₂+m₂y₁)/(m₁+m₂))',
            'Midpoint: ((x₁+x₂)/2, (y₁+y₂)/2)',
            'Area of △ = ½|x₁(y₂−y₃) + x₂(y₃−y₁) + x₃(y₁−y₂)|',
        ],
    },
    {
        chapter: 'Trigonometry',
        chapterNumber: 8,
        title: 'Ratios & Identities',
        emoji: '📏',
        formulas: [
            'sin²θ + cos²θ = 1',
            '1 + tan²θ = sec²θ',
            '1 + cot²θ = cosec²θ',
            'sin(90°−θ) = cosθ, cos(90°−θ) = sinθ',
            'tan(90°−θ) = cotθ',
        ],
    },
    {
        chapter: 'Trig. Applications',
        chapterNumber: 9,
        title: 'Height & Distance',
        emoji: '🏗️',
        formulas: [
            'Angle of elevation: from horizontal upward',
            'Angle of depression: from horizontal downward',
            'tanθ = height / distance (perpendicular/base)',
            'Line of sight = √(height² + distance²)',
        ],
    },
    {
        chapter: 'Circles',
        chapterNumber: 10,
        title: 'Tangent Properties',
        emoji: '⭕',
        formulas: [
            'Tangent ⊥ Radius at point of contact',
            'Tangents from external point are equal',
            'OA² = OP² + PA² (tangent from P to circle)',
            'Angle between tangents: 2 × arcsin(r/OP)',
        ],
    },
    {
        chapter: 'Areas (Circles)',
        chapterNumber: 11,
        title: 'Sector & Segment',
        emoji: '🟡',
        formulas: [
            'Area of circle = πr²',
            'Circumference = 2πr',
            'Area of sector = (θ/360°) × πr²',
            'Length of arc = (θ/360°) × 2πr',
            'Area of segment = Area of sector − Area of △',
        ],
    },
    {
        chapter: 'SA & Volumes',
        chapterNumber: 12,
        title: 'Solids Formulas',
        emoji: '📦',
        formulas: [
            'Cylinder: V = πr²h, CSA = 2πrh, TSA = 2πr(r+h)',
            'Cone: V = ⅓πr²h, CSA = πrl, l = √(r²+h²)',
            'Sphere: V = ⁴⁄₃πr³, SA = 4πr²',
            'Hemisphere: V = ⅔πr³, TSA = 3πr²',
        ],
    },
    {
        chapter: 'Statistics',
        chapterNumber: 13,
        title: 'Mean, Median, Mode',
        emoji: '📈',
        formulas: [
            'Mean (direct) = Σfᵢxᵢ / Σfᵢ',
            'Median = l + [(n/2 − cf) / f] × h',
            'Mode = l + [(f₁ − f₀) / (2f₁ − f₀ − f₂)] × h',
            'Empirical: Mode ≈ 3 Median − 2 Mean',
        ],
    },
    {
        chapter: 'Probability',
        chapterNumber: 14,
        title: 'Basic Probability',
        emoji: '🎲',
        formulas: [
            'P(E) = Favourable outcomes / Total outcomes',
            '0 ≤ P(E) ≤ 1',
            'P(E) + P(not E) = 1',
            'P(sure event) = 1, P(impossible event) = 0',
        ],
    },
];

// ── Quick Revision Tips ─────────────────────────────────────────────
export interface RevisionTip {
    title: string;
    tips: string[];
    emoji: string;
    subject: 'Mathematics' | 'Science';
}

export const QUICK_REVISION_TIPS: RevisionTip[] = [
    {
        title: 'Board Exam Strategy',
        emoji: '🎯',
        subject: 'Mathematics',
        tips: [
            'Attempt all questions — there is no negative marking',
            'Start with the section you are most confident in',
            'Draw neat diagrams in Geometry and Trigonometry',
            'Show all steps in calculations — marks are given for steps',
            'Use rough sheet for calculations, write clean answers',
        ],
    },
    {
        title: 'Common Mistakes to Avoid',
        emoji: '⚠️',
        subject: 'Mathematics',
        tips: [
            'Don\'t forget to write units in final answers',
            'Always verify if discriminant is positive before finding roots',
            'Check if AP is increasing or decreasing before applying formula',
            'In Coordinate Geometry, don\'t confuse (x,y) order',
            'In Statistics, identify the modal class correctly',
        ],
    },
    {
        title: 'High-Weightage Chapters',
        emoji: '⭐',
        subject: 'Mathematics',
        tips: [
            'Quadratic Equations (8 marks) — practice all 3 methods',
            'Trigonometry + Applications (16 marks) — master identities & height-distance',
            'Arithmetic Progressions (8 marks) — sum formulas are must',
            'Linear Equations (8 marks) — graphical + algebraic methods',
            'Triangles (8 marks) — BPT & Pythagoras proofs',
        ],
    },
];

// ── Helper: Detect chapter from question text ───────────────────────
/**
 * Auto-categorize a question into a chapter based on keyword matching.
 * Returns the chapter number or 0 if unmatched.
 */
export function detectChapter(
    questionText: string,
    subject: 'Mathematics' | 'Science'
): number {
    const chapters = subject === 'Mathematics' ? MATHS_CHAPTERS : SCIENCE_CHAPTERS;
    const text = questionText.toLowerCase();
    let bestMatch = 0;
    let bestScore = 0;

    for (const ch of chapters) {
        let score = 0;
        for (const kw of ch.keywords) {
            if (text.includes(kw.toLowerCase())) {
                score += kw.length; // Longer keyword match = higher confidence
            }
        }
        if (score > bestScore) {
            bestScore = score;
            bestMatch = ch.number;
        }
    }

    return bestMatch;
}

/**
 * Get chapter info by number.
 */
export function getChapterInfo(
    chapterNumber: number,
    subject: 'Mathematics' | 'Science'
): ChapterInfo | undefined {
    const chapters = subject === 'Mathematics' ? MATHS_CHAPTERS : SCIENCE_CHAPTERS;
    return chapters.find(ch => ch.number === chapterNumber);
}
