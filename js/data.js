/* =========================================================
   Deepak Kumar Behera — profile data
   Single source for the terminal and the command palette.
   ========================================================= */
window.DKB_DATA = {
  name: 'Deepak Kumar Behera',
  site: 'https://deepak17kb.github.io/',
  status: 'Open to work: jobs & internships',
  oneLiner: 'I make messy data make sense. Python, SQL and Power BI to find the truth, TypeScript to ship it.',
  email: 'deepak7521b@gmail.com',
  cv: 'assets/Deepak-Kumar-Behera-CV.pdf',
  cgpa: '8.04',
  links: {
    github: 'https://github.com/Deepak17kb',
    linkedin: 'https://linkedin.com/in/deepak-kumarbehera',
  },

  // Coffee, two ways: pay by UPI, or ask for a virtual coffee chat.
  // The UPI button and QR stay hidden until `upi` is set.
  coffee: {
    upi: null, // TODO(deepak): your UPI ID, e.g. 'name@okaxis'
    payee: 'Deepak Kumar Behera',
    sizes: [
      { name: 'Espresso', amount: 49 },
      { name: 'Cappuccino', amount: 99 },
      { name: 'Cold brew', amount: 199 },
    ],
  },

  sections: [
    { id: 'about', label: 'About' },
    { id: 'work', label: 'Selected work' },
    { id: 'journey', label: 'Journey' },
    { id: 'trophies', label: 'Trophies' },
    { id: 'lab', label: 'Path Lab' },
    { id: 'terminal', label: 'Terminal' },
    { id: 'contact', label: 'Contact' },
  ],

  projects: [
    { key: 'broadbridge', name: 'BroadBridge', featured: true, when: 'Sep 2026', metrics: ['239 tests passing', '9 what-if levers', '12 ranked-action rules'], what: 'AI wealth navigator, Monte Carlo goal odds', stack: 'TypeScript · React · Node · Claude/Groq', demo: 'https://deepak17kb.github.io/BroadBridge/', code: 'https://github.com/Deepak17kb/BroadBridge' },
    { key: 'upi', name: 'UPI Risk Desk', featured: true, team: true, when: 'Sep 2026', metrics: ['20K UPI payments analysed', '121 dispute rings found', '5 AI risk agents'], what: 'Fraud-ring detection, Best Pipeline @ AgentIQ Datathon', stack: 'Python · pandas · NetworkX · SQLite · Claude', demo: 'https://adityashukla2615.github.io/upi-risk-desk/outputs/upi_risk_desk.html?v=2', code: 'https://github.com/Deepak17kb/upi-risk-desk' },
    { key: 'saferoute', name: 'NER SafeRoute', featured: true, when: 'Sep 2026 · SIH', metrics: ['87.1% balanced accuracy (risk model)', '3,447 road segments scored', '8 NE states'], what: 'Hazard-aware truck routing for Northeast India', stack: 'FastAPI · React · Leaflet · PostGIS · scikit-learn', demo: 'https://ner-safe-route-psi.vercel.app/', code: 'https://github.com/Deepak17kb/NER-SafeRoute' },
    { key: 'lifeline', name: 'LifeLine', featured: true, when: 'Feb 2026', metrics: ['40 locations', '83 roads modelled', '96/96 tests passing'], what: 'Transit routing & emergency simulator', stack: 'C++17 · React · REST · graph algorithms', demo: 'https://lifeline-31iq.onrender.com', code: 'https://github.com/Deepak17kb/lifeline' },
    { key: 'krishimitra', name: 'KrishiMitra', what: 'AI farming assistant', stack: 'Node · Express · Gemini API', demo: 'https://krishi-mitra-silk-nine.vercel.app' },
    { key: 'jobs', name: 'Global Jobs Analytics', what: 'Power BI dashboard over 100K+ job records', stack: 'Power BI · DAX · Power Query', code: 'https://github.com/Deepak17kb/Global-Jobs-Hiring-Analytics' },
    { key: 'deadlock', name: 'Deadlock Detector', what: 'OS wait-for graph analysis', demo: 'https://automated-deadlock-detection-tool.vercel.app' },
    { key: 'echo', name: 'Echo Voice Studio', what: 'Voice notes that file themselves, dictation with grammar polish, reminders from plain speech; the Python backend runs in the browser via Pyodide', stack: 'Python · Pyodide/WebAssembly · SQLite · JavaScript · Web Speech API', demo: 'https://deepak17kb.github.io/Echo-Voice-Studio/', code: 'https://github.com/Deepak17kb/Echo-Voice-Studio' },
  ],

  achievements: [
    { rank: '#1', title: 'Winner, Best Pipeline', event: 'TransOrg AgentIQ Datathon', when: 'Sep 2026' },
    { rank: 'Top 10', title: 'Algo Arena', event: 'Hackathon' },
    { rank: 'Top 30', title: 'CodeXtreme 4.0', event: 'Java coding contest · LPU & iamneo', when: 'Mar 2026' },
    { rank: 'PMO', title: 'Letter of Appreciation', event: '“Pariksha Pe Charcha”, PMO India', when: 'Jul 2022' },
  ],

  education: [
    { what: 'B.Tech, Computer Science & Engineering', where: 'Lovely Professional University, Punjab', score: 'CGPA 8.04', when: 'Aug 2024 – present' },
    { what: 'Class XII', where: 'Kendriya Vidyalaya No. 1, Bhubaneswar', score: '81%', when: '2024' },
  ],

  experience: [
    { what: 'DSA Placement Bootcamp', where: 'Lovely Professional University', when: 'Jun – Aug 2026', note: '150+ C++ solutions, peak memory cut by 25%' },
    { what: 'Data Analytics Job Simulation', where: 'Deloitte × Forage', when: 'Dec 2025 – Feb 2026', note: '10,000-row ledger audit, 15+ billing anomalies flagged' },
    { what: 'CSR Internship, CyberSmart Awareness', where: 'WNS Cares Foundation', when: 'Jul – Aug 2025', note: 'cyber-safety outreach; performance rated excellent' },
  ],

  certs: [
    { name: 'Oracle Agentic AI Certified Foundations Associate', by: 'Oracle', when: 'Sep 2026' },
    { name: 'OCI AI Certified Foundations Associate', by: 'Oracle', when: 'Jul 2026' },
    { name: 'Oracle Data Platform 2025 Certified Foundations Associate', by: 'Oracle', when: 'May 2026' },
    { name: 'Fundamentals of Analytics on AWS, Parts 1 & 2', by: 'AWS', when: 'Feb 2026' },
    { name: 'Hadoop 101', by: 'IBM · Cognitive Class', when: 'May 2026' },
    { name: 'Full Stack Development with MERN', by: 'Nasscom Foundation · Cisco thingQbator' },
    { name: 'Database Management System, Parts 1 & 2', by: 'Infosys Springboard', when: 'Sep 2026' },
  ],

  skills: {
    Languages: 'Python, SQL, C++, Java, JavaScript, TypeScript',
    Web: 'Node.js, Express.js, React, REST APIs, HTML5/CSS3',
    Data: 'Power BI, DAX, Tableau, Power Query, MS SQL Server, MongoDB, Excel',
    Tools: 'Git/GitHub, VS Code, Jupyter, data storytelling, data validation',
  },
};
