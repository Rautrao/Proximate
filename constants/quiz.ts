/**
 * Onboarding quiz — five MCQs in five Indian languages. The user picks a
 * language, answers all five questions, and must get at least 4 right to
 * continue to registration.
 *
 * Purpose: friction filter for casual misuse. A determined attacker can
 * memorise these answers, so this is NOT a security boundary — it's a
 * speed bump that filters out drive-by abuse and surfaces "what is this
 * platform for" up front. Combined with phone OTP + community verification,
 * it raises the cost of misuse without locking out stressed legitimate users.
 */
export type LanguageCode = 'en' | 'hi' | 'ta' | 'te' | 'bn';

export type Language = {
  code: LanguageCode;
  label: string;       // shown in the language picker
  native: string;      // native script — primary display
  passLabel: string;   // "X correct" translated
};

export const LANGUAGES: Language[] = [
  { code: 'en', label: 'English',  native: 'English',  passLabel: 'correct' },
  { code: 'hi', label: 'Hindi',    native: 'हिन्दी',    passLabel: 'सही' },
  { code: 'ta', label: 'Tamil',    native: 'தமிழ்',    passLabel: 'சரியான' },
  { code: 'te', label: 'Telugu',   native: 'తెలుగు',   passLabel: 'సరైనది' },
  { code: 'bn', label: 'Bengali',  native: 'বাংলা',     passLabel: 'সঠিক' },
];

export type QuizQuestion = {
  id: string;
  text: Record<LanguageCode, string>;
  options: Record<LanguageCode, string[]>;
  /** index into options[] of the correct answer (same index across all languages) */
  correctIndex: number;
};

export const PASS_THRESHOLD = 4;       // of 5
export const FAIL_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes after failure

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'purpose',
    text: {
      en: 'What is Proximate built for?',
      hi: 'प्रोक्सिमेट किसके लिए बनाया गया है?',
      ta: 'புராக்ஸிமேட் எதற்காக கட்டப்பட்டது?',
      te: 'ప్రాక్సిమేట్ దేని కోసం నిర్మించబడింది?',
      bn: 'প্রক্সিমেট কেন তৈরি করা হয়েছে?',
    },
    options: {
      en: [
        'Social networking with strangers',
        'Alerting nearby people during a personal safety emergency',
        'Food delivery',
        'Music streaming',
      ],
      hi: [
        'अनजानों के साथ सोशल नेटवर्किंग',
        'व्यक्तिगत सुरक्षा आपात स्थिति में पास के लोगों को सूचित करना',
        'खाना डिलीवरी',
        'संगीत स्ट्रीमिंग',
      ],
      ta: [
        'அந்நியர்களுடன் சமூக வலையமைப்பு',
        'தனிப்பட்ட பாதுகாப்பு அவசரத்தின் போது அருகிலுள்ளவர்களை எச்சரிப்பது',
        'உணவு டெலிவரி',
        'இசை ஸ்ட்ரீமிங்',
      ],
      te: [
        'అపరిచితులతో సోషల్ నెట్‌వర్కింగ్',
        'వ్యక్తిగత భద్రతా అత్యవసర సమయంలో సమీపంలోని వ్యక్తులకు హెచ్చరిక',
        'ఆహార డెలివరీ',
        'సంగీత స్ట్రీమింగ్',
      ],
      bn: [
        'অপরিচিতদের সাথে সোশ্যাল নেটওয়ার্কিং',
        'ব্যক্তিগত নিরাপত্তা জরুরী অবস্থায় কাছাকাছি লোকদের সতর্ক করা',
        'খাবার ডেলিভারি',
        'সঙ্গীত স্ট্রিমিং',
      ],
    },
    correctIndex: 1,
  },
  {
    id: 'when',
    text: {
      en: 'When should you trigger an SOS alert?',
      hi: 'आपको SOS अलर्ट कब ट्रिगर करना चाहिए?',
      ta: 'எப்போது SOS எச்சரிக்கையைத் தூண்டுவீர்கள்?',
      te: 'మీరు SOS అలర్ట్‌ను ఎప్పుడు ట్రిగ్గర్ చేయాలి?',
      bn: 'আপনি কখন SOS সতর্কতা ট্রিগার করবেন?',
    },
    options: {
      en: [
        'When I am bored',
        'To prank a friend',
        'When I genuinely feel unsafe or am in danger',
        'To see if it works',
      ],
      hi: [
        'जब मैं बोर हो रहा हूँ',
        'किसी दोस्त के साथ मज़ाक करने के लिए',
        'जब मैं वास्तव में असुरक्षित महसूस करूँ या खतरे में हूँ',
        'यह देखने के लिए कि यह काम करता है',
      ],
      ta: [
        'நான் சலித்துப் போகும்போது',
        'நண்பருடன் கேலி செய்ய',
        'நான் உண்மையில் பாதுகாப்பற்றதாக உணரும்போது அல்லது ஆபத்தில் இருக்கும்போது',
        'இது வேலை செய்கிறதா என்று பார்க்க',
      ],
      te: [
        'నేను విసుగు చెందినప్పుడు',
        'స్నేహితుడిని ఏడిపించడానికి',
        'నేను నిజంగా అసురక్షితంగా భావించినప్పుడు లేదా ప్రమాదంలో ఉన్నప్పుడు',
        'ఇది పనిచేస్తుందో లేదో చూడటానికి',
      ],
      bn: [
        'যখন আমি বিরক্ত হই',
        'বন্ধুর সাথে মজা করার জন্য',
        'যখন আমি সত্যিই অনিরাপদ অনুভব করি বা বিপদে আছি',
        'এটি কাজ করে কিনা দেখার জন্য',
      ],
    },
    correctIndex: 2,
  },
  {
    id: 'shared',
    text: {
      en: 'Who receives your live location when you trigger SOS?',
      hi: 'जब आप SOS ट्रिगर करते हैं तो आपकी लाइव लोकेशन कौन प्राप्त करता है?',
      ta: 'நீங்கள் SOS ஐத் தூண்டும்போது உங்கள் நேரடி இருப்பிடத்தை யார் பெறுகிறார்கள்?',
      te: 'మీరు SOS ట్రిగ్గర్ చేసినప్పుడు మీ లైవ్ లొకేషన్ ఎవరు పొందుతారు?',
      bn: 'আপনি SOS ট্রিগার করলে আপনার লাইভ অবস্থান কারা পায়?',
    },
    options: {
      en: [
        'Nobody — it stays on my phone',
        'Anyone with an internet connection, publicly',
        'Nearby Proximate users, my emergency contacts, and the nearest police station',
        'It is posted to social media',
      ],
      hi: [
        'कोई नहीं — यह मेरे फोन पर रहता है',
        'इंटरनेट कनेक्शन वाला कोई भी, सार्वजनिक रूप से',
        'पास के Proximate उपयोगकर्ता, मेरे आपातकालीन संपर्क, और निकटतम पुलिस स्टेशन',
        'इसे सोशल मीडिया पर पोस्ट किया जाता है',
      ],
      ta: [
        'யாரும் இல்லை — அது என் தொலைபேசியில் இருக்கும்',
        'இணைய இணைப்பு உள்ள எவரும், பகிரங்கமாக',
        'அருகிலுள்ள Proximate பயனர்கள், எனது அவசர தொடர்புகள், மற்றும் அருகிலுள்ள காவல் நிலையம்',
        'அது சமூக ஊடகங்களில் இடப்படுகிறது',
      ],
      te: [
        'ఎవరూ లేరు — అది నా ఫోన్‌లో ఉంటుంది',
        'ఇంటర్నెట్ కనెక్షన్ ఉన్న ఎవరైనా, బహిరంగంగా',
        'సమీపంలోని Proximate వినియోగదారులు, నా అత్యవసర పరిచయాలు, మరియు సమీప పోలీసు స్టేషన్',
        'ఇది సోషల్ మీడియాలో పోస్ట్ చేయబడుతుంది',
      ],
      bn: [
        'কেউ না — এটি আমার ফোনে থাকে',
        'ইন্টারনেট সংযোগ আছে এমন যে কেউ, প্রকাশ্যে',
        'কাছাকাছি Proximate ব্যবহারকারী, আমার জরুরী পরিচিতি, এবং নিকটতম পুলিশ স্টেশন',
        'এটি সোশ্যাল মিডিয়ায় পোস্ট করা হয়',
      ],
    },
    correctIndex: 2,
  },
  {
    id: 'responder',
    text: {
      en: 'You receive an SOS alert as a responder. What should you do?',
      hi: 'आपको रिस्पॉन्डर के रूप में SOS अलर्ट मिलता है। आपको क्या करना चाहिए?',
      ta: 'நீங்கள் ஒரு பதிலளிப்பாளராக SOS எச்சரிக்கையைப் பெறுகிறீர்கள். நீங்கள் என்ன செய்ய வேண்டும்?',
      te: 'మీరు రెస్పాండర్‌గా SOS అలర్ట్ అందుకుంటారు. మీరు ఏమి చేయాలి?',
      bn: 'আপনি একজন রেসপন্ডার হিসাবে একটি SOS সতর্কতা পান। আপনার কী করা উচিত?',
    },
    options: {
      en: [
        'Ignore it',
        'Take photos and post on social media',
        'Assess the situation safely — if safe, approach to help, or contact police',
        'Call the victim and make jokes',
      ],
      hi: [
        'इसे अनदेखा करें',
        'फोटो लें और सोशल मीडिया पर पोस्ट करें',
        'सुरक्षित रूप से स्थिति का आकलन करें — यदि सुरक्षित हो, मदद के लिए जाएं, या पुलिस से संपर्क करें',
        'पीड़ित को कॉल करें और मज़ाक करें',
      ],
      ta: [
        'அதைப் புறக்கணிக்கவும்',
        'புகைப்படங்கள் எடுத்து சமூக ஊடகங்களில் இடவும்',
        'நிலைமையை பாதுகாப்பாக மதிப்பிடவும் — பாதுகாப்பாக இருந்தால், உதவ அணுகவும், அல்லது காவல்துறையைத் தொடர்பு கொள்ளவும்',
        'பாதிக்கப்பட்டவரை அழைத்து கேலி செய்யவும்',
      ],
      te: [
        'దానిని విస్మరించండి',
        'ఫోటోలు తీసి సోషల్ మీడియాలో పోస్ట్ చేయండి',
        'పరిస్థితిని సురక్షితంగా అంచనా వేయండి — సురక్షితంగా ఉంటే, సహాయం కోసం చేరుకోండి, లేదా పోలీసులను సంప్రదించండి',
        'బాధితుడిని పిలిచి జోకులు వేయండి',
      ],
      bn: [
        'এটি উপেক্ষা করুন',
        'ছবি তুলুন এবং সোশ্যাল মিডিয়ায় পোস্ট করুন',
        'পরিস্থিতি নিরাপদে মূল্যায়ন করুন — নিরাপদ হলে, সাহায্য করতে এগিয়ে যান, বা পুলিশের সাথে যোগাযোগ করুন',
        'ভিকটিমকে ফোন করুন এবং মজা করুন',
      ],
    },
    correctIndex: 2,
  },
  {
    id: 'why_verify',
    text: {
      en: 'Why does Proximate verify users before allowing access?',
      hi: 'Proximate पहुँच की अनुमति देने से पहले उपयोगकर्ताओं को क्यों सत्यापित करता है?',
      ta: 'அணுகலை அனுமதிப்பதற்கு முன் Proximate ஏன் பயனர்களைச் சரிபார்க்கிறது?',
      te: 'యాక్సెస్ అనుమతించే ముందు Proximate ఎందుకు వినియోగదారులను ధృవీకరిస్తుంది?',
      bn: 'অ্যাক্সেস অনুমতি দেওয়ার আগে Proximate কেন ব্যবহারকারীদের যাচাই করে?',
    },
    options: {
      en: [
        'To collect data for advertisements',
        'To prevent the platform being misused by potential attackers',
        'There is no reason',
        'To charge subscription fees',
      ],
      hi: [
        'विज्ञापनों के लिए डेटा एकत्र करने के लिए',
        'संभावित हमलावरों द्वारा प्लेटफ़ॉर्म के दुरुपयोग को रोकने के लिए',
        'कोई कारण नहीं है',
        'सदस्यता शुल्क लेने के लिए',
      ],
      ta: [
        'விளம்பரங்களுக்கான தரவைச் சேகரிக்க',
        'சாத்தியமான தாக்குதலாளர்களால் தளம் தவறாகப் பயன்படுத்தப்படுவதைத் தடுக்க',
        'எந்தக் காரணமும் இல்லை',
        'சந்தா கட்டணம் வசூலிக்க',
      ],
      te: [
        'ప్రకటనల కోసం డేటాను సేకరించడానికి',
        'సంభావ్య దాడిదారులచే ప్లాట్‌ఫారమ్ దుర్వినియోగాన్ని నివారించడానికి',
        'ఎటువంటి కారణం లేదు',
        'సబ్‌స్క్రిప్షన్ ఫీజులను వసూలు చేయడానికి',
      ],
      bn: [
        'বিজ্ঞাপনের জন্য তথ্য সংগ্রহ করতে',
        'সম্ভাব্য আক্রমণকারীদের দ্বারা প্ল্যাটফর্মের অপব্যবহার রোধ করতে',
        'কোন কারণ নেই',
        'সাবস্ক্রিপশন ফি চার্জ করতে',
      ],
    },
    correctIndex: 1,
  },
];

// Translated UI strings used across the quiz flow. The per-language
// "correct" word lives on LANGUAGES.passLabel — see passLabelFor() in
// app/(auth)/quiz.tsx.
export const UI_STRINGS: Record<LanguageCode, {
  pickLanguage: string;
  instructions: string;
  question: string;
  of: string;
  next: string;
  submit: string;
  passed: string;
  failed: string;
  continueToRegister: string;
  tryAgainIn: string;
  minutes: string;
}> = {
  en: {
    pickLanguage: 'Pick your language',
    instructions: 'Answer 5 questions about Proximate. You need at least 4 correct to continue.',
    question: 'Question',
    of: 'of',
    next: 'Next',
    submit: 'Submit',
    passed: 'You passed — welcome to Proximate.',
    failed: 'Verification failed.',
    continueToRegister: 'Continue to register',
    tryAgainIn: 'Try again in',
    minutes: 'minutes',
  },
  hi: {
    pickLanguage: 'अपनी भाषा चुनें',
    instructions: 'Proximate के बारे में 5 प्रश्नों के उत्तर दें। जारी रखने के लिए आपको कम से कम 4 सही चाहिए।',
    question: 'प्रश्न',
    of: 'का',
    next: 'अगला',
    submit: 'जमा करें',
    passed: 'आप उत्तीर्ण हुए — Proximate में आपका स्वागत है।',
    failed: 'सत्यापन विफल।',
    continueToRegister: 'पंजीकरण के लिए जारी रखें',
    tryAgainIn: 'फिर से प्रयास करें',
    minutes: 'मिनट में',
  },
  ta: {
    pickLanguage: 'உங்கள் மொழியைத் தேர்ந்தெடுக்கவும்',
    instructions: 'Proximate பற்றி 5 கேள்விகளுக்கு பதிலளிக்கவும். தொடர குறைந்தபட்சம் 4 சரியாக இருக்க வேண்டும்.',
    question: 'கேள்வி',
    of: 'இல்',
    next: 'அடுத்து',
    submit: 'சமர்ப்பிக்கவும்',
    passed: 'நீங்கள் தேர்ச்சி பெற்றீர்கள் — Proximate க்கு வரவேற்கிறோம்.',
    failed: 'சரிபார்ப்பு தோல்வியடைந்தது.',
    continueToRegister: 'பதிவு செய்ய தொடரவும்',
    tryAgainIn: 'மீண்டும் முயற்சிக்கவும்',
    minutes: 'நிமிடங்களில்',
  },
  te: {
    pickLanguage: 'మీ భాషను ఎంచుకోండి',
    instructions: 'Proximate గురించి 5 ప్రశ్నలకు సమాధానం ఇవ్వండి. కొనసాగడానికి కనీసం 4 సరిగ్గా ఉండాలి.',
    question: 'ప్రశ్న',
    of: 'లో',
    next: 'తదుపరి',
    submit: 'సమర్పించండి',
    passed: 'మీరు ఉత్తీర్ణులయ్యారు — Proximateకి స్వాగతం.',
    failed: 'ధృవీకరణ విఫలమైంది.',
    continueToRegister: 'నమోదుకు కొనసాగండి',
    tryAgainIn: 'మళ్లీ ప్రయత్నించండి',
    minutes: 'నిమిషాలలో',
  },
  bn: {
    pickLanguage: 'আপনার ভাষা নির্বাচন করুন',
    instructions: 'Proximate সম্পর্কে 5টি প্রশ্নের উত্তর দিন। চালিয়ে যেতে কমপক্ষে 4টি সঠিক হতে হবে।',
    question: 'প্রশ্ন',
    of: 'এর',
    next: 'পরবর্তী',
    submit: 'জমা দিন',
    passed: 'আপনি উত্তীর্ণ হয়েছেন — Proximate-এ স্বাগতম।',
    failed: 'যাচাইকরণ ব্যর্থ হয়েছে।',
    continueToRegister: 'নিবন্ধনে চালিয়ে যান',
    tryAgainIn: 'আবার চেষ্টা করুন',
    minutes: 'মিনিটে',
  },
};
