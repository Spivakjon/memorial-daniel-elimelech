// config.js - כל הנתונים האישיים מרוכזים כאן
// ============================================
// כדי להתאים לאדם אחר - שנו רק קובץ זה!
// ============================================

var SITE_CONFIG = {

    // ===== פרטי האתר =====
    siteTitle: 'לזכר דניאל אלימלך ז"ל',
    builtBy: 'יהונתן ספיבק',
    password: '2708',  // סיסמת ניהול

    // ===== נפטרים (מערך - תומך ב-1 או 2 אנשים) =====
    people: [
        {
            key: 'daniel',
            name: 'דניאל אלימלך',
            fullNameHebrew: 'דניאל אלימלך',
            gender: 'male',
            birthYear: '1939',
            birthDateGregorian: '1939-08-23',
            birthDateHebrew: 'ה\' אלול תרצ"ט',
            deathYear: '2022',
            deathDateGregorian: '2022-08-30',
            deathDateHebrew: 'ח\' אלול תשפ"ב',
            fatherName: '',          // TODO: שם האב - להשכבה
            motherName: '',          // TODO: שם האם
            cemetery: '',            // TODO: בית עלמין
            cemeteryWazeUrl: '',     // TODO: קישור Waze לבית העלמין
            descriptor: 'בעלי, אבינו, חמינו וסבנו היקר',  // TODO: תואר במודעה
            lettersForTehillim: ['ד', 'נ', 'י', 'א', 'ל', 'א', 'ל', 'י', 'מ', 'ל', 'כ'],
            nameGroups: {
                all: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
                first: [0, 1, 2, 3, 4],       // דניאל
                last: [5, 6, 7, 8, 9, 10]     // אלימלך
            }
        }
    ],

    // ===== אותיות נשמה (אוניברסלי) =====
    neshamaLetters: ['נ', 'ש', 'מ', 'ה'],

    // ===== הגדרות אזכרה - ברירת מחדל =====
    // השאירו date ריק כדי שלא תוצג תזכורת עד שתקבע אזכרה דרך מסך הניהול
    azkaraDefaults: {
        forPerson: 'daniel',
        date: '',                  // ריק = לא מוצגת תזכורת בדף הבית
        time: '',
        location: '',
        yearLabel: ''              // ריק = יחושב אוטומטית משנת הפטירה
    },

    // ===== עץ משפחה =====
    familyTree: {
        name: 'דניאל אלימלך ז"ל וזהבה אלימלך',
        spouseName: 'זהבה',
        spouseLastName: '',
        spouseBirthDate: '',
        spouseAlive: true,
        info: '',
        level: 'root',
        children: [
            {
                name: 'יורם וליז אלימלך',
                info: '',
                level: 'child',
                _ed: { firstName: 'יורם', spouseName: 'ליז', lastName: 'אלימלך', birthDate: '', spouseBirthDate: '', weddingDate: '' },
                children: [
                    { name: 'עדן ויהונתן', info: '', level: 'gc',
                      _ed: { firstName: 'עדן', spouseName: 'יהונתן', lastName: '', birthDate: '', spouseBirthDate: '', weddingDate: '' }, children: [] },
                    { name: 'אור', info: '', level: 'gc',
                      _ed: { firstName: 'אור', spouseName: '', lastName: '', birthDate: '', spouseBirthDate: '', weddingDate: '' }, children: [] },
                    { name: 'ירין', info: '', level: 'gc',
                      _ed: { firstName: 'ירין', spouseName: '', lastName: '', birthDate: '', spouseBirthDate: '', weddingDate: '' }, children: [] }
                ]
            },
            {
                name: 'מיכל ואיציק',
                info: '',
                level: 'child',
                _ed: { firstName: 'מיכל', spouseName: 'איציק', lastName: '', birthDate: '', spouseBirthDate: '', weddingDate: '' },
                children: [
                    { name: 'קרולין ובר', info: '', level: 'gc',
                      _ed: { firstName: 'קרולין', spouseName: 'בר', lastName: '', birthDate: '', spouseBirthDate: '', weddingDate: '' }, children: [] },
                    { name: 'קורל ושגב', info: '', level: 'gc',
                      _ed: { firstName: 'קורל', spouseName: 'שגב', lastName: '', birthDate: '', spouseBirthDate: '', weddingDate: '' }, children: [] },
                    { name: 'דורין', info: '', level: 'gc',
                      _ed: { firstName: 'דורין', spouseName: '', lastName: '', birthDate: '', spouseBirthDate: '', weddingDate: '' }, children: [] },
                    { name: 'איתי', info: '', level: 'gc',
                      _ed: { firstName: 'איתי', spouseName: '', lastName: '', birthDate: '', spouseBirthDate: '', weddingDate: '' }, children: [] }
                ]
            },
            {
                name: 'רונן ואורטל אלימלך',
                info: '',
                level: 'child',
                _ed: { firstName: 'רונן', spouseName: 'אורטל', lastName: 'אלימלך', birthDate: '', spouseBirthDate: '', weddingDate: '' },
                children: [
                    { name: 'שובל', info: '', level: 'gc',
                      _ed: { firstName: 'שובל', spouseName: '', lastName: '', birthDate: '', spouseBirthDate: '', weddingDate: '' }, children: [] },
                    { name: 'אורי', info: '', level: 'gc',
                      _ed: { firstName: 'אורי', spouseName: '', lastName: '', birthDate: '', spouseBirthDate: '', weddingDate: '' }, children: [] },
                    { name: 'אריאל', info: '', level: 'gc',
                      _ed: { firstName: 'אריאל', spouseName: '', lastName: '', birthDate: '', spouseBirthDate: '', weddingDate: '' }, children: [] }
                ]
            }
        ]
    },

    // ===== גלריה =====
    // שמות בני משפחה לזיהוי אוטומטי בתיאורי תמונות
    familyNames: ['דניאל'],         // TODO: הוסיפו שמות בני משפחה

    // קבוצות לתיוג אנשים בגלריה
    familyGroups: [
        { label: 'סבא', members: ['דניאל'] }
        // TODO: הוסיפו קבוצות נוספות:
        // { label: 'משפחת ...', members: ['שם1', 'שם2'] }
    ],

    // קטגוריות גלריה
    categories: ['הכל', 'משפחה', 'אירועים', 'אישי', 'הועלו וטרם מוינו', 'ללא תיוג'],

    // תמונות סטטיות (מקומיות)
    staticPhotos: [
        // הוסיפו תמונות בפורמט:
        // {
        //     src: 'images/photo1.jpg',
        //     description: 'תיאור התמונה',
        //     people: ['דניאל'],
        //     category: 'משפחה',
        //     period: 'שנות ה-2010',
        //     isStatic: true
        // }
    ],

    // Google Apps Script URL (הדביקו כאן אחרי Deploy)
    appsScriptUrl: 'https://script.google.com/macros/s/AKfycbxPvAwKrhXJl9wxne_SkmkryuJ_6FXkC_qf2Fs0HnrAwJ5bz76nj4gRnem-1owbl70TYw/exec',

    // שם תיקיית Google Drive
    driveFolderName: 'הנצחה דניאל אלימלך - תמונות',

    // מילות מפתח לסיווג אוטומטי של תמונות
    coupleWords: [],  // מילים שמזהות תמונת זוג (לא רלוונטי כאן)
    eventWords: ['יום הולדת', 'חתונה', 'בר מצווה', 'בת מצווה', 'חג', 'פסח', 'ראש השנה',
        'סוכות', 'חנוכה', 'פורים', 'שבת', 'חגיגה', 'מסיבה', 'אירוע', 'טקס',
        'אזכרה', 'שמחה'],
    personalWords: ['דניאל', 'סבא', 'לבד', 'פורטרט']
};
