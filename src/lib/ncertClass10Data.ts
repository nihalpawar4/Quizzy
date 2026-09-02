/**
 * NCERT Class 10 Static Data
 * ─────────────────────────────────────────────────────────────────────
 * Chapter lists, formula cards, PYQ year labels, and keyword mappings
 * for auto-categorizing questions from Firestore.
 * Zero Firestore reads — pure constants.
 */

// ── PYQ Year Labels ──────────────────────────────────────────────────
export const PYQ_YEARS = [2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011, 2010] as const;
export type PYQYear = typeof PYQ_YEARS[number];

// ── Maths Chapters (NCERT Class 10) ─────────────────────────────────
export interface ChapterInfo {
    number: number;
    name: string;
    shortName: string;
    keywords: string[];
    weightage: number;
    hasNumericals: boolean;
}

export const MATHS_CHAPTERS: ChapterInfo[] = [
    { number: 1, name: 'Real Numbers', shortName: 'Real Numbers', keywords: ['real number', 'hcf', 'lcm', 'euclid', 'irrational', 'rational', 'prime factorization', 'fundamental theorem', 'divisibility'], weightage: 6, hasNumericals: true },
    { number: 2, name: 'Polynomials', shortName: 'Polynomials', keywords: ['polynomial', 'zeroes', 'zeros', 'quadratic polynomial', 'coefficient', 'degree', 'linear polynomial', 'cubic polynomial', 'sum of zeroes', 'product of zeroes'], weightage: 7, hasNumericals: true },
    { number: 3, name: 'Pair of Linear Equations in Two Variables', shortName: 'Linear Equations', keywords: ['linear equation', 'two variables', 'substitution', 'elimination', 'cross multiplication', 'consistent', 'inconsistent', 'pair of linear', 'graphical method', 'simultaneous'], weightage: 8, hasNumericals: true },
    { number: 4, name: 'Quadratic Equations', shortName: 'Quadratic Equations', keywords: ['quadratic equation', 'discriminant', 'roots', 'nature of roots', 'quadratic formula', 'factorisation', 'factorization', 'completing the square', 'b\u00b2-4ac', 'b2-4ac'], weightage: 8, hasNumericals: true },
    { number: 5, name: 'Arithmetic Progressions', shortName: 'Arithmetic Progressions', keywords: ['arithmetic progression', 'common difference', 'nth term', 'sum of n terms', 'a.p.', 'ap ', 'first term', 'last term', 'arithmetic sequence'], weightage: 8, hasNumericals: true },
    { number: 6, name: 'Triangles', shortName: 'Triangles', keywords: ['triangle', 'similar', 'congruent', 'pythagoras', 'bpt', 'basic proportionality', 'thales', 'mid-point', 'altitude', 'median', 'similarity'], weightage: 8, hasNumericals: true },
    { number: 7, name: 'Coordinate Geometry', shortName: 'Coordinate Geometry', keywords: ['coordinate', 'distance formula', 'section formula', 'mid point', 'midpoint', 'centroid', 'area of triangle', 'collinear', 'x-axis', 'y-axis', 'origin'], weightage: 6, hasNumericals: true },
    { number: 8, name: 'Introduction to Trigonometry', shortName: 'Trigonometry', keywords: ['trigonometry', 'sin', 'cos', 'tan', 'cosec', 'sec', 'cot', 'trigonometric ratio', 'trigonometric identity', 'complementary angle', 'sin\u00b2', 'cos\u00b2'], weightage: 8, hasNumericals: true },
    { number: 9, name: 'Some Applications of Trigonometry', shortName: 'Trig. Applications', keywords: ['height and distance', 'angle of elevation', 'angle of depression', 'shadow', 'tower', 'building', 'lighthouse', 'application of trigonometry', 'line of sight'], weightage: 8, hasNumericals: true },
    { number: 10, name: 'Circles', shortName: 'Circles', keywords: ['circle', 'tangent', 'secant', 'chord', 'radius', 'diameter', 'concentric', 'point of contact', 'tangent to a circle', 'external point'], weightage: 4, hasNumericals: true },
    { number: 11, name: 'Areas Related to Circles', shortName: 'Areas (Circles)', keywords: ['area of circle', 'perimeter', 'circumference', 'sector', 'segment', 'arc', 'area of sector', 'area of segment', 'quadrant', 'semicircle'], weightage: 4, hasNumericals: true },
    { number: 12, name: 'Surface Areas and Volumes', shortName: 'SA & Volumes', keywords: ['surface area', 'volume', 'cylinder', 'cone', 'sphere', 'hemisphere', 'frustum', 'cuboid', 'cube', 'combination of solids', 'melted', 'converted'], weightage: 6, hasNumericals: true },
    { number: 13, name: 'Statistics', shortName: 'Statistics', keywords: ['mean', 'median', 'mode', 'frequency', 'cumulative frequency', 'ogive', 'class interval', 'grouped data', 'ungrouped data', 'histogram'], weightage: 5, hasNumericals: true },
    { number: 14, name: 'Probability', shortName: 'Probability', keywords: ['probability', 'equally likely', 'favourable outcome', 'sample space', 'event', 'dice', 'coin', 'card', 'random', 'experiment'], weightage: 4, hasNumericals: true },
];

// ── Science Chapters (NCERT Class 10) ───────────────────────────────
export const SCIENCE_CHAPTERS: ChapterInfo[] = [
    { number: 1, name: 'Chemical Reactions and Equations', shortName: 'Chemical Reactions', keywords: ['chemical reaction', 'equation', 'balanced', 'reactant', 'product', 'decomposition', 'displacement', 'combination', 'oxidation', 'reduction', 'corrosion', 'rancidity'], weightage: 5, hasNumericals: false },
    { number: 2, name: 'Acids, Bases and Salts', shortName: 'Acids & Bases', keywords: ['acid', 'base', 'salt', 'ph', 'indicator', 'litmus', 'neutralisation', 'neutralization', 'baking soda', 'bleaching powder', 'plaster of paris'], weightage: 5, hasNumericals: false },
    { number: 3, name: 'Metals and Non-metals', shortName: 'Metals', keywords: ['metal', 'non-metal', 'metallurgy', 'alloy', 'corrosion', 'reactivity series', 'ionic bond', 'extraction', 'ore', 'mineral'], weightage: 5, hasNumericals: false },
    { number: 4, name: 'Carbon and its Compounds', shortName: 'Carbon', keywords: ['carbon', 'organic', 'covalent bond', 'hydrocarbon', 'methane', 'ethanol', 'ethanoic acid', 'soap', 'detergent', 'functional group', 'homologous series'], weightage: 5, hasNumericals: false },
    { number: 5, name: 'Life Processes', shortName: 'Life Processes', keywords: ['nutrition', 'respiration', 'transportation', 'excretion', 'photosynthesis', 'digestion', 'heart', 'kidney', 'lungs', 'blood', 'stomata'], weightage: 5, hasNumericals: false },
    { number: 6, name: 'Control and Coordination', shortName: 'Control & Coord.', keywords: ['nervous system', 'hormone', 'brain', 'spinal cord', 'reflex', 'synapse', 'endocrine', 'pituitary', 'thyroid', 'adrenaline', 'insulin', 'stimulus'], weightage: 4, hasNumericals: false },
    { number: 7, name: 'How Do Organisms Reproduce?', shortName: 'Reproduction', keywords: ['reproduction', 'asexual', 'sexual', 'fission', 'budding', 'fragmentation', 'pollination', 'fertilisation', 'fertilization', 'zygote', 'embryo', 'menstruation'], weightage: 4, hasNumericals: false },
    { number: 8, name: 'Heredity and Evolution', shortName: 'Heredity', keywords: ['heredity', 'evolution', 'gene', 'dna', 'trait', 'mendel', 'dominant', 'recessive', 'natural selection', 'speciation', 'variation', 'fossil'], weightage: 4, hasNumericals: false },
    { number: 9, name: 'Light \u2014 Reflection and Refraction', shortName: 'Light', keywords: ['light', 'reflection', 'refraction', 'mirror', 'lens', 'focal length', 'concave', 'convex', 'snell', 'refractive index', 'image', 'magnification', 'mirror formula'], weightage: 6, hasNumericals: true },
    { number: 10, name: 'The Human Eye and the Colourful World', shortName: 'Human Eye', keywords: ['human eye', 'accommodation', 'myopia', 'hypermetropia', 'presbyopia', 'prism', 'dispersion', 'rainbow', 'scattering', 'tyndall', 'atmospheric refraction'], weightage: 3, hasNumericals: false },
    { number: 11, name: 'Electricity', shortName: 'Electricity', keywords: ['electricity', 'current', 'voltage', 'resistance', 'ohm', 'circuit', 'series', 'parallel', 'resistor', 'ammeter', 'voltmeter', 'power', 'watt', 'joule', 'heating effect'], weightage: 7, hasNumericals: true },
    { number: 12, name: 'Magnetic Effects of Electric Current', shortName: 'Magnetism', keywords: ['magnetic', 'electromagnet', 'solenoid', 'fleming', 'electric motor', 'generator', 'electromagnetic induction', 'galvanometer', 'fuse', 'direct current', 'alternating current'], weightage: 4, hasNumericals: true },
    { number: 13, name: 'Our Environment', shortName: 'Environment', keywords: ['environment', 'ecosystem', 'food chain', 'food web', 'biodegradable', 'non-biodegradable', 'ozone', 'trophic level', 'producer', 'consumer', 'decomposer'], weightage: 3, hasNumericals: false },
];

// ── Formula Cards (Maths \u2014 Key Formulas per Chapter) ────────────────
export interface FormulaCard {
    chapter: string;
    chapterNumber: number;
    title: string;
    formulas: string[];
}

export const MATHS_FORMULA_CARDS: FormulaCard[] = [
    { chapter: 'Real Numbers', chapterNumber: 1, title: 'HCF & LCM', formulas: ['HCF \u00d7 LCM = Product of two numbers', 'HCF(a,b) \u00d7 LCM(a,b) = a \u00d7 b', 'Every composite number can be expressed as a product of primes (Fundamental Theorem)', 'If p divides a\u00b2, then p divides a (p is prime)'] },
    { chapter: 'Polynomials', chapterNumber: 2, title: 'Zeroes Relations', formulas: ['Sum of zeroes (\u03b1+\u03b2) = \u2212b/a', 'Product of zeroes (\u03b1\u03b2) = c/a', 'Quadratic: ax\u00b2 + bx + c, a \u2260 0', 'Cubic: Sum = \u2212b/a, Sum(pair) = c/a, Product = \u2212d/a'] },
    { chapter: 'Linear Equations', chapterNumber: 3, title: 'Consistency Conditions', formulas: ['Unique solution: a\u2081/a\u2082 \u2260 b\u2081/b\u2082', 'Infinite solutions: a\u2081/a\u2082 = b\u2081/b\u2082 = c\u2081/c\u2082', 'No solution: a\u2081/a\u2082 = b\u2081/b\u2082 \u2260 c\u2081/c\u2082', 'Methods: Substitution, Elimination, Cross-multiplication'] },
    { chapter: 'Quadratic Equations', chapterNumber: 4, title: 'Roots & Discriminant', formulas: ['x = (\u2212b \u00b1 \u221a(b\u00b2\u22124ac)) / 2a', 'D = b\u00b2 \u2212 4ac (discriminant)', 'D > 0 \u2192 Two distinct real roots', 'D = 0 \u2192 Two equal real roots', 'D < 0 \u2192 No real roots'] },
    { chapter: 'Arithmetic Progressions', chapterNumber: 5, title: 'AP Formulas', formulas: ['nth term: a\u2099 = a + (n\u22121)d', 'Sum of n terms: S\u2099 = n/2 [2a + (n\u22121)d]', 'S\u2099 = n/2 [a + l] where l = last term', 'Common difference: d = a\u2082 \u2212 a\u2081'] },
    { chapter: 'Triangles', chapterNumber: 6, title: 'Similarity & BPT', formulas: ['BPT: If DE \u2225 BC, then AD/DB = AE/EC', 'AAA, AA, SSS, SAS similarity criteria', 'Pythagoras: Hyp\u00b2 = Base\u00b2 + Perp\u00b2', 'Ratio of areas = (ratio of sides)\u00b2'] },
    { chapter: 'Coordinate Geometry', chapterNumber: 7, title: 'Distance & Section', formulas: ['Distance = \u221a[(x\u2082\u2212x\u2081)\u00b2 + (y\u2082\u2212y\u2081)\u00b2]', 'Section formula: ((m\u2081x\u2082+m\u2082x\u2081)/(m\u2081+m\u2082), (m\u2081y\u2082+m\u2082y\u2081)/(m\u2081+m\u2082))', 'Midpoint: ((x\u2081+x\u2082)/2, (y\u2081+y\u2082)/2)', 'Area of \u25b3 = \u00bd|x\u2081(y\u2082\u2212y\u2083) + x\u2082(y\u2083\u2212y\u2081) + x\u2083(y\u2081\u2212y\u2082)|'] },
    { chapter: 'Trigonometry', chapterNumber: 8, title: 'Ratios & Identities', formulas: ['sin\u00b2\u03b8 + cos\u00b2\u03b8 = 1', '1 + tan\u00b2\u03b8 = sec\u00b2\u03b8', '1 + cot\u00b2\u03b8 = cosec\u00b2\u03b8', 'sin(90\u00b0\u2212\u03b8) = cos\u03b8, cos(90\u00b0\u2212\u03b8) = sin\u03b8', 'tan(90\u00b0\u2212\u03b8) = cot\u03b8'] },
    { chapter: 'Trig. Applications', chapterNumber: 9, title: 'Height & Distance', formulas: ['Angle of elevation: from horizontal upward', 'Angle of depression: from horizontal downward', 'tan\u03b8 = height / distance (perpendicular/base)', 'Line of sight = \u221a(height\u00b2 + distance\u00b2)'] },
    { chapter: 'Circles', chapterNumber: 10, title: 'Tangent Properties', formulas: ['Tangent \u22a5 Radius at point of contact', 'Tangents from external point are equal', 'OA\u00b2 = OP\u00b2 + PA\u00b2 (tangent from P to circle)', 'Angle between tangents: 2 \u00d7 arcsin(r/OP)'] },
    { chapter: 'Areas (Circles)', chapterNumber: 11, title: 'Sector & Segment', formulas: ['Area of circle = \u03c0r\u00b2', 'Circumference = 2\u03c0r', 'Area of sector = (\u03b8/360\u00b0) \u00d7 \u03c0r\u00b2', 'Length of arc = (\u03b8/360\u00b0) \u00d7 2\u03c0r', 'Area of segment = Area of sector \u2212 Area of \u25b3'] },
    { chapter: 'SA & Volumes', chapterNumber: 12, title: 'Solids Formulas', formulas: ['Cylinder: V = \u03c0r\u00b2h, CSA = 2\u03c0rh, TSA = 2\u03c0r(r+h)', 'Cone: V = \u2153\u03c0r\u00b2h, CSA = \u03c0rl, l = \u221a(r\u00b2+h\u00b2)', 'Sphere: V = \u2074\u2044\u2083\u03c0r\u00b3, SA = 4\u03c0r\u00b2', 'Hemisphere: V = \u2154\u03c0r\u00b3, TSA = 3\u03c0r\u00b2'] },
    { chapter: 'Statistics', chapterNumber: 13, title: 'Mean, Median, Mode', formulas: ['Mean (direct) = \u03a3f\u1d62x\u1d62 / \u03a3f\u1d62', 'Median = l + [(n/2 \u2212 cf) / f] \u00d7 h', 'Mode = l + [(f\u2081 \u2212 f\u2080) / (2f\u2081 \u2212 f\u2080 \u2212 f\u2082)] \u00d7 h', 'Empirical: Mode \u2248 3 Median \u2212 2 Mean'] },
    { chapter: 'Probability', chapterNumber: 14, title: 'Basic Probability', formulas: ['P(E) = Favourable outcomes / Total outcomes', '0 \u2264 P(E) \u2264 1', 'P(E) + P(not E) = 1', 'P(sure event) = 1, P(impossible event) = 0'] },
];

// ── Quick Revision Tips ─────────────────────────────────────────────
export interface RevisionTip {
    title: string;
    tips: string[];
    subject: 'Mathematics' | 'Science';
}

export const QUICK_REVISION_TIPS: RevisionTip[] = [
    {
        title: 'Board Exam Strategy',
        subject: 'Mathematics',
        tips: [
            'Attempt all questions \u2014 there is no negative marking',
            'Start with the section you are most confident in',
            'Draw neat diagrams in Geometry and Trigonometry',
            'Show all steps in calculations \u2014 marks are given for steps',
            'Use rough sheet for calculations, write clean answers',
        ],
    },
    {
        title: 'Common Mistakes to Avoid',
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
        subject: 'Mathematics',
        tips: [
            'Quadratic Equations (8 marks) \u2014 practice all 3 methods',
            'Trigonometry + Applications (16 marks) \u2014 master identities & height-distance',
            'Arithmetic Progressions (8 marks) \u2014 sum formulas are must',
            'Linear Equations (8 marks) \u2014 graphical + algebraic methods',
            'Triangles (8 marks) \u2014 BPT & Pythagoras proofs',
        ],
    },
];

// ── Helper: Detect chapter from question text ───────────────────────
export function detectChapter(questionText: string, subject: 'Mathematics' | 'Science'): number {
    const chapters = subject === 'Mathematics' ? MATHS_CHAPTERS : SCIENCE_CHAPTERS;
    const text = questionText.toLowerCase();
    let bestMatch = 0;
    let bestScore = 0;
    for (const ch of chapters) {
        let score = 0;
        for (const kw of ch.keywords) {
            if (text.includes(kw.toLowerCase())) { score += kw.length; }
        }
        if (score > bestScore) { bestScore = score; bestMatch = ch.number; }
    }
    return bestMatch;
}

export function getChapterInfo(chapterNumber: number, subject: 'Mathematics' | 'Science'): ChapterInfo | undefined {
    const chapters = subject === 'Mathematics' ? MATHS_CHAPTERS : SCIENCE_CHAPTERS;
    return chapters.find(ch => ch.number === chapterNumber);
}
