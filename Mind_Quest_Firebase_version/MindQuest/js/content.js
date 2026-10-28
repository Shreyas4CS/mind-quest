/* ================================================================
   MindQuest content: well-being areas and the weekly quests.
   The areas follow the CBSE-style Holistic Well-being Report Card (Preparatory 3-5,
   Middle 6-8, Secondary 9-12) and its 4-step scale: Developing, Progressing,
   Consistent, Strength. Each week is about 20 to 25 minutes for a child.
   Answer option scores (s) run 1 (Developing) to 4 (Strength); children never see them.
   ================================================================ */
const STAGES = { p: 'Preparatory stage (Grades 3-5)', m: 'Middle stage (Grades 6-8)', s: 'Secondary stage (Grades 9-12)' };
const stageOf = g => (+g <= 5 ? 'p' : +g <= 8 ? 'm' : 's');
const LEVELS = [
  { k: 'dev', label: 'Developing', short: 'Needs regular guidance', c: '#E5484D' },
  { k: 'pro', label: 'Progressing', short: 'Shows it sometimes, with reminders', c: '#F59E0B' },
  { k: 'con', label: 'Consistent', short: 'Shows it in familiar situations', c: '#2EC4B6' },
  { k: 'str', label: 'Strength', short: 'Shows it independently and helps others', c: '#16A34A' }
];
const levelOf = v => v == null ? null : LEVELS[v < .4 ? 0 : v < .6 ? 1 : v < .8 ? 2 : 3];

/* the well-being areas; names change a little by stage, exactly as the report card does */
const DOMAINS = {
  feelings: { icon: 'heart', short: 'Feelings', p: 'Emotional awareness', m: 'Self-awareness and identity', s: 'Self-awareness and values', what: 'Can name feelings and share them in a healthy way.' },
  coping: { icon: 'leaf', short: 'Calm & coping', p: 'Calming and coping', m: 'Emotional regulation', s: 'Stress awareness and coping', what: 'Uses a calming strategy when upset, stressed or disappointed.' },
  resilience: { icon: 'replay', short: 'Bouncing back', p: 'Trying again', m: 'Resilience', s: 'Resilience and adaptability', what: 'Tries a next step after a setback instead of giving up.' },
  confidence: { icon: 'star', short: 'Confidence', p: 'Confidence and voice', m: 'Self-esteem and confidence', s: 'Self-worth and confidence', what: 'Shares ideas and asks questions without putting self or others down.' },
  friendship: { icon: 'users', short: 'Friendship', p: 'Friendship and empathy', m: 'Peer relationships', s: 'Relationships and boundaries', what: 'Notices others’ feelings, builds respectful friendships, handles conflict kindly.' },
  inclusion: { icon: 'family', short: 'Kindness & respect', p: 'Respect and inclusion', m: 'Empathy and inclusion', s: 'Empathy and social responsibility', what: 'Includes others, respects differences and stands against bullying.' },
  communication: { icon: 'chat', short: 'Communication', p: 'Communication', m: 'Communication and boundaries', s: 'Communication and boundaries', what: 'Listens, takes turns, expresses needs and respects boundaries.' },
  helpseeking: { icon: 'shield', short: 'Asking for help', p: 'Help-seeking', m: 'Help-seeking and trust', s: 'Help-seeking and support networks', what: 'Knows a trusted adult and asks for help when needed.' },
  belonging: { icon: 'school', short: 'Belonging & safety', p: 'Belonging and safety', m: 'Belonging and safety', s: 'Belonging and safety', what: 'Feels welcomed and safe, and can say what affects that.' },
  habits: { icon: 'sun', short: 'Habits & balance', p: 'Healthy habits and routines', m: 'Self-management', s: 'Time, rest and balance', what: 'Values sleep, movement, routines and breaks; plans tasks.' },
  digital: { icon: 'globe', short: 'Screens & online', p: 'Screen balance', m: 'Digital well-being', s: 'Digital and social well-being', what: 'Makes thoughtful choices about screen time, privacy and online behaviour.' },
  decisions: { icon: 'compass', short: 'Choices & goals', p: 'Independence and choices', m: 'Making good choices', s: 'Decision-making and future readiness', what: 'Thinks about consequences and safety; sets small goals.' }
};
const domainName = (k, g) => DOMAINS[k] ? DOMAINS[k][stageOf(g)] : k;

/* item types and how long each usually takes (for the time plan) */
const TYPES = {
  mood: { label: 'Mood check', icon: 'mood', est: 30 },
  chat: { label: 'Chat with Coggy', icon: 'chat', est: 180 },
  scenario: { label: 'What would you do?', icon: 'compass', est: 40 },
  rate: { label: 'About me', icon: 'user', est: 15 },
  story: { label: 'Story video', icon: 'video', est: 240 },
  focus: { label: 'Star Catcher (focus)', icon: 'target', est: 90 },
  memory: { label: 'Light Trail (memory)', icon: 'brain', est: 120 },
  breathe: { label: 'Calm breath', icon: 'leaf', est: 60 },
  voice: { label: 'My voice', icon: 'mic', est: 75 },
  checkin: { label: 'Check-in', icon: 'shield', est: 30 },
  game: { label: 'Game mission', icon: 'gamepad', est: 45 }
};
const RATE_OPTS = [{ t: 'Not like me', s: 1, f: 'sad' }, { t: 'A little like me', s: 2, f: 'neutral' }, { t: 'A lot like me', s: 3, f: 'happy' }, { t: 'Totally me!', s: 4, f: 'wow' }];
const MOODS = [
  { k: 'happy', t: 'Happy' }, { k: 'neutral', t: 'Okay' }, { k: 'sleepy', t: 'Tired' }, { k: 'sad', t: 'Sad' },
  { k: 'fearful', t: 'Worried' }, { k: 'angry', t: 'Angry' }, { k: 'wow', t: 'Excited' }, { k: 'surprised', t: 'Confused' }
];
const MOOD_SCORE = { happy: 1, wow: 1, neutral: .65, surprised: .5, sleepy: .45, sad: .15, fearful: .15, angry: .2 };

/* chips on the profile */
const LIKES = ['Drawing', 'Music', 'Singing', 'Dance', 'Cricket', 'Football', 'Badminton', 'Swimming', 'Reading', 'Stories', 'Science', 'Maths puzzles', 'Coding', 'Video games', 'Animals', 'Nature', 'Cooking', 'Crafts', 'Space', 'Acting', 'Chess', 'Cycling', 'Lego & building', 'Photography'];
const SCARY = ['The dark', 'Exams and tests', 'Speaking in front of class', 'Being alone', 'Making mistakes', 'Heights', 'Dogs or animals', 'Insects', 'Loud noises', 'Water / swimming', 'New people', 'Being scolded', 'Getting hurt', 'Losing friends'];
const AVATARS = ['🦊', '🐼', '🦁', '🐯', '🐨', '🐸', '🦄', '🐙', '🦉', '🐬', '🐢', '🐝', '🚀', '🤖', '🧑‍🚀', '🦸'];
const WORLDS = { 4: ['mars', 'Mars Mission'], 5: ['ocean', 'Ocean Odyssey'], 6: ['jungle', 'Jungle Quest'], 7: ['arctic', 'Arctic Expedition'], 8: ['kingdom', 'Enchanted Kingdom'], 9: ['cyber', 'Cyber City'] };

/* ---------------- the weeks ---------------- */
const WEEKS = [
  /* ===================== WEEK 1 ===================== */
  {
    week: 1, title: 'All About Me', sub: 'Feelings, strengths and feeling at home in school', color: '#F7941D', icon: 'heart',
    items: [
      { type: 'mood', id: 'w1m0', when: 'start', say: 'Hi! Before we start, how are you feeling right now?' },
      { type: 'chat', id: 'w1chat', title: 'Getting to know you', domains: ['feelings', 'confidence', 'communication'], turns: [
        { key: 'day', say: 'Hello {name}! I am Coggy, your MindQuest buddy. Tell me, how was your day today?', domain: 'feelings' },
        { key: 'like', say: 'Thanks for telling me! I heard you like {like}. What do you enjoy most about it?', domain: 'confidence' },
        { key: 'proud', say: 'That sounds great. What is one thing you did recently that made you feel proud of yourself?', domain: 'confidence' },
        { key: 'school', say: 'Last one! What is the best part of being at school, and is there any part that feels hard?', domain: 'belonging' }
      ] },
      { type: 'scenario', id: 'w1s1', domain: 'feelings', text: 'Your best friend is moving to another city. You feel a heavy, sad feeling inside. What do you do?', opts: [
        { t: 'Tell my friend or a family member that I feel sad and will miss them', s: 4 }, { t: 'Draw or write about how I feel', s: 3 }, { t: 'Pretend I am fine and keep it inside', s: 2 }, { t: 'Get angry at everyone for no reason', s: 1 }] },
      { type: 'scenario', id: 'w1s2', domain: 'confidence', text: 'Your teacher asks a question and you think you know the answer, but you are not fully sure.', opts: [
        { t: 'Raise my hand and try. Mistakes help me learn', s: 4 }, { t: 'Tell the answer quietly to my friend', s: 2 }, { t: 'Stay quiet in case others laugh', s: 1 }, { t: 'Ask the teacher a question to check my idea', s: 3 }] },
      { type: 'scenario', id: 'w1s3', domain: 'belonging', text: 'It is your first day in a new school. At lunch, you do not know anyone.', opts: [
        { t: 'Sit alone and wait for the day to end', s: 1 }, { t: 'Smile and ask a group if I can join them', s: 4 }, { t: 'Ask the teacher who I could sit with', s: 3 }, { t: 'Eat quickly and go to the library', s: 2 }] },
      { type: 'scenario', id: 'w1s4', domain: 'feelings', text: 'You lost a game you really wanted to win. Your face feels hot and you want to cry.', opts: [
        { t: 'Say "I feel upset" and take a few slow breaths', s: 4 }, { t: 'Throw the game pieces', s: 1 }, { t: 'Walk away without talking to anyone', s: 2 }, { t: 'Congratulate the winner even though it is hard', s: 3 }] },
      { type: 'scenario', id: 'w1s5', domain: 'confidence', text: 'A classmate says your drawing looks "weird". You worked hard on it.', opts: [
        { t: 'Tear up the drawing', s: 1 }, { t: 'Say "I like it. Everyone draws differently"', s: 4 }, { t: 'Feel bad and stop drawing for a while', s: 2 }, { t: 'Ask what they would change, then decide for myself', s: 3 }] },
      { type: 'scenario', id: 'w1s6', domain: 'helpseeking', text: 'Someone keeps taking your lunch box snacks without asking, every day.', opts: [
        { t: 'Tell my teacher or a trusted adult about it', s: 4 }, { t: 'Say firmly "Please stop, that is mine"', s: 3 }, { t: 'Hide my snacks and say nothing', s: 2 }, { t: 'Take their things to get even', s: 1 }] },
      { type: 'scenario', id: 'w1s7', domain: 'habits', text: 'It is a school night. Your favourite show has one more episode and it is already late.', opts: [
        { t: 'Switch off and sleep. I can watch tomorrow', s: 4 }, { t: 'Watch it quickly then sleep', s: 2 }, { t: 'Watch more episodes, sleep is boring', s: 1 }, { t: 'Ask my parent to remind me of bedtime next time', s: 3 }] },
      { type: 'scenario', id: 'w1s8', domain: 'belonging', text: 'Your class is choosing teams and you are picked last.', opts: [
        { t: 'Feel it is not fair but play my best anyway', s: 4 }, { t: 'Refuse to play', s: 1 }, { t: 'Tell the teacher later that teams could be made fairly', s: 3 }, { t: 'Play but feel I am not good at anything', s: 2 }] },
      { type: 'rate', id: 'w1r1', domain: 'feelings', text: 'I can tell when I am feeling happy, sad, angry or worried.' },
      { type: 'rate', id: 'w1r2', domain: 'confidence', text: 'I like sharing my ideas in class.' },
      { type: 'rate', id: 'w1r3', domain: 'belonging', text: 'I feel welcome and safe in my school.' },
      { type: 'rate', id: 'w1r4', domain: 'confidence', text: 'I know some things I am really good at.' },
      { type: 'rate', id: 'w1r5', domain: 'feelings', text: 'I keep my feelings inside even when they bother me.', reverse: true },
      { type: 'rate', id: 'w1r6', domain: 'helpseeking', text: 'There is an adult at school I can talk to.' },
      { type: 'story', id: 'w1story', title: 'Meera’s Big Speech', domains: ['confidence', 'coping', 'friendship'], scenes: [
        { bg: 'class', line: 'Meera has to give a speech in front of the whole class tomorrow. Her topic is her favourite animal: the elephant.', chars: [{ n: 'Meera', c: '#FF6FB5', mood: 'happy', x: 330 }, { n: 'Teacher', c: '#4D96FF', mood: 'happy', x: 520, adult: true }] },
        { bg: 'home', line: 'At home, Meera practises. But her hands start shaking and her tummy feels funny. "What if everyone laughs at me?"', chars: [{ n: 'Meera', c: '#FF6FB5', mood: 'fearful', x: 320 }] },
        { stop: { q: 'How is Meera feeling right now?', domain: 'feelings', opts: [{ t: 'Nervous and worried', s: 4 }, { t: 'Angry', s: 1 }, { t: 'Bored', s: 1 }, { t: 'Excited and calm', s: 2 }] } },
        { bg: 'home', line: 'Her grandmother sees her and sits beside her. "Shall I tell you a trick? Take a deep breath, and imagine you are talking to just one friend."', chars: [{ n: 'Meera', c: '#FF6FB5', mood: 'neutral', x: 260 }, { n: 'Grandma', c: '#9B5DE5', mood: 'happy', x: 430, adult: true }] },
        { stop: { q: 'What would help YOU if you were nervous like Meera?', domain: 'coping', opts: [{ t: 'Practise and take slow deep breaths', s: 4 }, { t: 'Talk to someone I trust about it', s: 4 }, { t: 'Pretend to be sick and skip school', s: 1 }, { t: 'Worry about it all night', s: 1 }] } },
        { bg: 'class', line: 'The next day, Meera starts her speech. In the middle, she forgets a line! Some children giggle.', chars: [{ n: 'Meera', c: '#FF6FB5', mood: 'sad', x: 330 }, { n: 'Kabir', c: '#2EC4B6', mood: 'happy', x: 150 }, { n: 'Zoya', c: '#FFC93C', mood: 'neutral', x: 510 }] },
        { stop: { q: 'If you were Meera’s classmate, what would you do?', domain: 'friendship', opts: [{ t: 'Smile at her and give a thumbs up', s: 4 }, { t: 'Giggle with the others', s: 1 }, { t: 'Look away and do nothing', s: 2 }, { t: 'Tell the gigglers later that it was not kind', s: 3 }] } },
        { bg: 'class', line: 'Zoya smiles and gives a thumbs up. Meera takes a deep breath, looks at her notes, and finishes her speech. Everyone claps!', chars: [{ n: 'Meera', c: '#FF6FB5', mood: 'wow', x: 330 }, { n: 'Kabir', c: '#2EC4B6', mood: 'happy', x: 150 }, { n: 'Zoya', c: '#FFC93C', mood: 'happy', x: 510 }] }
      ] },
      { type: 'focus', id: 'w1focus', level: 1 },
      { type: 'voice', id: 'w1v1', domain: 'confidence', key: 'proud', text: 'Tell me one thing you feel proud of. You can speak or type.' },
      { type: 'breathe', id: 'w1b' },
      { type: 'memory', id: 'w1mem' },
      { type: 'voice', id: 'w1v2', domain: 'helpseeking', key: 'person', text: 'Who is a person at school you can talk to when something is wrong? Why that person?' },
      { type: 'checkin', id: 'w1ci' },
      { type: 'mood', id: 'w1m1', when: 'end', say: 'You finished this week’s quest! How are you feeling now?' }
    ]
  },
  /* ===================== WEEK 2 ===================== */
  {
    week: 2, title: 'Friends & Kindness', sub: 'Friendship, respect, including others and talking it out', color: '#2EC4B6', icon: 'users',
    items: [
      { type: 'mood', id: 'w2m0', when: 'start', say: 'Welcome back! How are you feeling today?' },
      { type: 'chat', id: 'w2chat', title: 'Friends talk', domains: ['friendship', 'communication', 'inclusion'], turns: [
        { key: 'friend', say: 'Hi {name}! This week is all about friends. Who is a good friend of yours, and what do you like doing together?', domain: 'friendship' },
        { key: 'fight', say: 'Nice! Sometimes friends disagree. Tell me about a time you and a friend did not agree. What happened?', domain: 'communication' },
        { key: 'kind', say: 'Thank you for sharing. What is one kind thing someone did for you that you still remember?', domain: 'inclusion' },
        { key: 'alone', say: 'Do you ever feel left out? What helps you when that happens?', domain: 'belonging' }
      ] },
      { type: 'scenario', id: 'w2s1', domain: 'inclusion', text: 'A new student who speaks a different language joins your class. Some kids copy her accent and laugh.', opts: [
        { t: 'Laugh along so they do not tease me', s: 1 }, { t: 'Say "That is not kind" and invite her to sit with us', s: 4 }, { t: 'Be nice to her later when no one is watching', s: 2 }, { t: 'Tell the teacher what is happening', s: 3 }] },
      { type: 'scenario', id: 'w2s2', domain: 'friendship', text: 'Your friend looks upset and is sitting alone at break time.', opts: [
        { t: 'Go and ask "Are you okay? Want to talk?"', s: 4 }, { t: 'Leave them alone, they will be fine', s: 2 }, { t: 'Bring them to play with our group', s: 3 }, { t: 'Ignore it, it is not my problem', s: 1 }] },
      { type: 'scenario', id: 'w2s3', domain: 'communication', text: 'You and your friend both want to be the leader of a group project.', opts: [
        { t: 'Shout until they give up', s: 1 }, { t: 'Take turns or share the leader jobs', s: 4 }, { t: 'Let them lead but feel annoyed inside', s: 2 }, { t: 'Ask the group to vote fairly', s: 3 }] },
      { type: 'scenario', id: 'w2s4', domain: 'inclusion', text: 'Your group is making a team for a game. One child who is not very good at sports wants to join.', opts: [
        { t: 'Say yes. Everyone should get to play', s: 4 }, { t: 'Say no, we want to win', s: 1 }, { t: 'Say yes, and help them learn the game', s: 4 }, { t: 'Say maybe next time', s: 2 }] },
      { type: 'scenario', id: 'w2s5', domain: 'communication', text: 'A friend borrowed your favourite pen and broke it. They did not say sorry.', opts: [
        { t: 'Tell them calmly "I feel upset that my pen broke"', s: 4 }, { t: 'Break something of theirs', s: 1 }, { t: 'Stop talking to them forever', s: 1 }, { t: 'Ask them to be more careful next time', s: 3 }] },
      { type: 'scenario', id: 'w2s6', domain: 'friendship', text: 'Your friends want you to skip your turn on the swing so their other friend can go first. You have waited a long time.', opts: [
        { t: 'Say "I have waited, it is my turn now. You can go next"', s: 4 }, { t: 'Give up my turn but feel sad', s: 2 }, { t: 'Push the other kid away', s: 1 }, { t: 'Suggest everyone takes short turns', s: 3 }] },
      { type: 'scenario', id: 'w2s7', domain: 'digital', text: 'Someone in a class chat group posts a funny but mean photo of a classmate.', stage: 'pm', opts: [
        { t: 'Send laughing emojis', s: 1 }, { t: 'Do not share it and tell a trusted adult', s: 4 }, { t: 'Message "Please delete this, it is hurtful"', s: 3 }, { t: 'Ignore it and scroll on', s: 2 }] },
      { type: 'scenario', id: 'w2s8', domain: 'belonging', text: 'Your friends are planning a party and you find out you were not invited.', opts: [
        { t: 'Feel sad, then talk to a friend about it', s: 4 }, { t: 'Spread a rumour about them', s: 1 }, { t: 'Decide nobody likes me', s: 1 }, { t: 'Spend time with other friends who are kind to me', s: 3 }] },
      { type: 'rate', id: 'w2r1', domain: 'friendship', text: 'I notice when my friends are sad.' },
      { type: 'rate', id: 'w2r2', domain: 'communication', text: 'I listen to others and wait for my turn to speak.' },
      { type: 'rate', id: 'w2r3', domain: 'inclusion', text: 'I play and work with children who are different from me.' },
      { type: 'rate', id: 'w2r4', domain: 'friendship', text: 'I have at least one friend I can trust.' },
      { type: 'rate', id: 'w2r5', domain: 'communication', text: 'When I am upset with someone, I shout or stop talking to them.', reverse: true },
      { type: 'rate', id: 'w2r6', domain: 'belonging', text: 'I often feel left out by others.', reverse: true },
      { type: 'story', id: 'w2story', title: 'The Empty Seat', domains: ['inclusion', 'friendship', 'communication'], scenes: [
        { bg: 'canteen', line: 'It is lunch time. Arjun, a new boy, holds his tray and looks for a place to sit. Every table seems full.', chars: [{ n: 'Arjun', c: '#4D96FF', mood: 'fearful', x: 320 }] },
        { bg: 'canteen', line: 'At one table, Kabir has an empty seat beside him. His friend whispers, "Don’t let him sit, he is weird."', chars: [{ n: 'Kabir', c: '#2EC4B6', mood: 'neutral', x: 220 }, { n: 'Rohan', c: '#FF6B6B', mood: 'angry', x: 400 }, { n: 'Arjun', c: '#4D96FF', mood: 'sad', x: 560 }] },
        { stop: { q: 'What should Kabir do?', domain: 'inclusion', opts: [{ t: 'Wave Arjun over to the empty seat', s: 4 }, { t: 'Agree with his friend', s: 1 }, { t: 'Pretend he did not hear', s: 2 }, { t: 'Tell his friend that is not kind', s: 3 }] } },
        { bg: 'canteen', line: 'Kabir waves Arjun over. "You can sit here!" Rohan frowns and folds his arms.', chars: [{ n: 'Kabir', c: '#2EC4B6', mood: 'happy', x: 220 }, { n: 'Arjun', c: '#4D96FF', mood: 'happy', x: 380 }, { n: 'Rohan', c: '#FF6B6B', mood: 'angry', x: 540 }] },
        { stop: { q: 'Rohan is upset with Kabir now. What is a good way for Kabir to talk to Rohan?', domain: 'communication', opts: [{ t: 'Calmly explain that everyone should feel welcome', s: 4 }, { t: 'Shout at Rohan', s: 1 }, { t: 'Stop being Rohan’s friend', s: 2 }, { t: 'Ask Rohan to give Arjun a chance', s: 3 }] } },
        { bg: 'park', line: 'Later, Arjun shows them an amazing paper plane trick. Even Rohan laughs and asks him to teach it.', chars: [{ n: 'Kabir', c: '#2EC4B6', mood: 'wow', x: 200 }, { n: 'Arjun', c: '#4D96FF', mood: 'happy', x: 350 }, { n: 'Rohan', c: '#FF6B6B', mood: 'happy', x: 500 }] },
        { stop: { q: 'What did the story teach you?', domain: 'friendship', opts: [{ t: 'Giving someone a chance can make a new friend', s: 4 }, { t: 'Paper planes are fun', s: 2 }, { t: 'New kids are always weird', s: 1 }, { t: 'Kindness can change how others act', s: 4 }] } }
      ] },
      { type: 'focus', id: 'w2focus', level: 2 },
      { type: 'voice', id: 'w2v1', domain: 'friendship', key: 'goodfriend', text: 'What makes someone a good friend? Tell me in your own words.' },
      { type: 'breathe', id: 'w2b' },
      { type: 'memory', id: 'w2mem' },
      { type: 'voice', id: 'w2v2', domain: 'inclusion', key: 'kindact', text: 'Tell me about a time you helped someone or were kind to them.' },
      { type: 'checkin', id: 'w2ci' },
      { type: 'mood', id: 'w2m1', when: 'end', say: 'Great job this week! How are you feeling now?' }
    ]
  },
  /* ===================== WEEK 3 ===================== */
  {
    week: 3, title: 'Calm & Brave', sub: 'Handling worry, stress and setbacks, and asking for help', color: '#9B5DE5', icon: 'leaf',
    items: [
      { type: 'mood', id: 'w3m0', when: 'start', say: 'Hello again! How are you feeling right now?' },
      { type: 'chat', id: 'w3chat', title: 'Worries and wins', domains: ['coping', 'helpseeking', 'resilience'], turns: [
        { key: 'worry', say: 'Hi {name}. Everyone has worries sometimes, even grown-ups. What is something that makes you worried or stressed?', domain: 'coping' },
        { key: 'helps', say: 'Thank you for telling me, that is brave. When you feel like that, what helps you feel better?', domain: 'coping' },
        { key: 'mistake', say: 'Tell me about a time something went wrong, like a bad test or a lost match. What did you do next?', domain: 'resilience' },
        { key: 'trust', say: 'If something was really bothering you, who would you tell?', domain: 'helpseeking' }
      ] },
      { type: 'scenario', id: 'w3s1', domain: 'coping', text: 'You have a big test tomorrow and your heart is beating fast. You cannot stop thinking about it.', opts: [
        { t: 'Make a small plan, revise a little, then rest', s: 4 }, { t: 'Take deep breaths and tell a parent I feel nervous', s: 4 }, { t: 'Stay up all night studying', s: 2 }, { t: 'Decide I will fail anyway', s: 1 }],
        alt: { s: { text: 'Board exams are close. You feel you are behind and everyone else is doing better than you.', opts: [{ t: 'Make a realistic timetable with breaks and focus on my own progress', s: 4 }, { t: 'Talk to a teacher or parent about the pressure', s: 4 }, { t: 'Study all night and skip meals', s: 2 }, { t: 'Give up because it is too late', s: 1 }] } } },
      { type: 'scenario', id: 'w3s2', domain: 'resilience', text: 'You practised a lot but still did not get selected for the school team.', opts: [
        { t: 'Ask the coach what I can improve and keep practising', s: 4 }, { t: 'Feel sad for a day, then try something else I enjoy', s: 3 }, { t: 'Quit sports forever', s: 1 }, { t: 'Say the coach is unfair', s: 2 }] },
      { type: 'scenario', id: 'w3s3', domain: 'coping', text: 'Your younger sibling broke your favourite toy or gadget. You feel very angry.', opts: [
        { t: 'Hit them', s: 1 }, { t: 'Go to my room, cool down, then talk', s: 4 }, { t: 'Shout loudly at them', s: 1 }, { t: 'Tell a parent how I feel', s: 3 }] },
      { type: 'scenario', id: 'w3s4', domain: 'helpseeking', text: 'An older student keeps saying mean things to you on the way home.', opts: [
        { t: 'Tell my parents and teacher', s: 4 }, { t: 'Keep it a secret, it might get worse', s: 1 }, { t: 'Walk home with friends and tell an adult', s: 4 }, { t: 'Say mean things back', s: 2 }] },
      { type: 'scenario', id: 'w3s5', domain: 'resilience', text: 'You get a lower mark than you expected in a subject you like.', opts: [
        { t: 'Look at my mistakes to learn from them', s: 4 }, { t: 'Hide the paper from my parents', s: 1 }, { t: 'Think "I am just bad at this"', s: 2 }, { t: 'Ask my teacher for help with the hard parts', s: 4 }] },
      { type: 'scenario', id: 'w3s6', domain: 'coping', text: 'You feel tired and grumpy, and you have a lot of homework.', opts: [
        { t: 'Take a short break, drink water, then start with the easiest task', s: 4 }, { t: 'Cry and do nothing', s: 1 }, { t: 'Rush through it carelessly', s: 2 }, { t: 'Ask for help to plan my work', s: 3 }] },
      { type: 'scenario', id: 'w3s7', domain: 'helpseeking', text: 'You do not understand what the teacher explained, and everyone else seems to get it.', opts: [
        { t: 'Ask the teacher after class', s: 4 }, { t: 'Ask a friend to explain', s: 3 }, { t: 'Copy someone’s work', s: 1 }, { t: 'Stay quiet and hope it is not in the test', s: 1 }] },
      { type: 'scenario', id: 'w3s8', domain: 'decisions', text: 'Friends dare you to do something risky, like climbing a high wall.', opts: [
        { t: 'Say no. It is not safe, even if they tease me', s: 4 }, { t: 'Do it so they think I am brave', s: 1 }, { t: 'Suggest a safer fun challenge instead', s: 3 }, { t: 'Walk away without saying anything', s: 2 }] },
      { type: 'rate', id: 'w3r1', domain: 'coping', text: 'When I am upset, I know something that helps me calm down.' },
      { type: 'rate', id: 'w3r2', domain: 'resilience', text: 'When something is hard, I keep trying.' },
      { type: 'rate', id: 'w3r3', domain: 'coping', text: 'I worry a lot about things.', reverse: true },
      { type: 'rate', id: 'w3r4', domain: 'helpseeking', text: 'I ask for help when I need it.' },
      { type: 'rate', id: 'w3r5', domain: 'resilience', text: 'If I make a mistake, I feel like giving up.', reverse: true },
      { type: 'rate', id: 'w3r6', domain: 'coping', text: 'I can stay calm when things do not go my way.' },
      { type: 'story', id: 'w3story', title: 'Kabir and the Broken Model', domains: ['resilience', 'coping', 'helpseeking'], scenes: [
        { bg: 'home', line: 'Kabir spent two weeks building a volcano model for the science fair. It is the night before the fair.', chars: [{ n: 'Kabir', c: '#2EC4B6', mood: 'happy', x: 320 }] },
        { bg: 'bus', line: 'On the school bus, someone bumps into him. The model falls and cracks into pieces!', chars: [{ n: 'Kabir', c: '#2EC4B6', mood: 'surprised', x: 300 }, { n: 'Student', c: '#FFC93C', mood: 'fearful', x: 480 }] },
        { stop: { q: 'What might Kabir be feeling?', domain: 'feelings', opts: [{ t: 'Shocked, sad and maybe angry', s: 4 }, { t: 'Happy', s: 1 }, { t: 'Nothing at all', s: 1 }, { t: 'A little upset', s: 3 }] } },
        { bg: 'class', line: 'Kabir wants to shout at the boy who bumped him. He feels like crying. Then he remembers: stop, breathe, think.', chars: [{ n: 'Kabir', c: '#2EC4B6', mood: 'angry', x: 300 }] },
        { stop: { q: 'What is the best next step for Kabir?', domain: 'coping', opts: [{ t: 'Take deep breaths, then tell his teacher what happened', s: 4 }, { t: 'Shout at the boy', s: 1 }, { t: 'Go home and miss the fair', s: 1 }, { t: 'Try to fix it with tape and glue', s: 3 }] } },
        { bg: 'class', line: 'His teacher, Ms. Rao, listens. "Accidents happen. Let’s see what we can fix together." His friends bring tape, glue and paint.', chars: [{ n: 'Kabir', c: '#2EC4B6', mood: 'neutral', x: 220 }, { n: 'Ms. Rao', c: '#4D96FF', mood: 'happy', x: 400, adult: true }, { n: 'Zoya', c: '#FFC93C', mood: 'happy', x: 560 }] },
        { stop: { q: 'Who helped Kabir, and why did asking for help work?', domain: 'helpseeking', opts: [{ t: 'His teacher and friends, because he told them what happened', s: 4 }, { t: 'No one, he did it all alone', s: 2 }, { t: 'Asking for help is a sign of weakness', s: 1 }, { t: 'Only his friends', s: 2 }] } },
        { bg: 'class', line: 'The volcano is a little cracked, but it works! Kabir explains how he fixed it, and the judges love his never-give-up story.', chars: [{ n: 'Kabir', c: '#2EC4B6', mood: 'wow', x: 300 }, { n: 'Ms. Rao', c: '#4D96FF', mood: 'happy', x: 480, adult: true }] }
      ] },
      { type: 'focus', id: 'w3focus', level: 3 },
      { type: 'voice', id: 'w3v1', domain: 'coping', key: 'whathelps', text: 'When you feel worried or upset, what is something that helps you?', stageText: { s: 'What helps you stay balanced during busy or stressful times?' } },
      { type: 'breathe', id: 'w3b', long: true },
      { type: 'memory', id: 'w3mem' },
      { type: 'voice', id: 'w3v2', domain: 'resilience', key: 'tryagain', text: 'Tell me about something that was hard for you at first but you kept trying.' },
      { type: 'checkin', id: 'w3ci' },
      { type: 'mood', id: 'w3m1', when: 'end', say: 'You were calm and brave this week! How are you feeling now?' }
    ]
  },
  /* ===================== WEEK 4 ===================== */
  {
    week: 4, title: 'Healthy Me, Smart Screens', sub: 'Sleep, routines, screen balance, online safety and good choices', color: '#4D96FF', icon: 'sun',
    items: [
      { type: 'mood', id: 'w4m0', when: 'start', say: 'Hi! Last quest of the month. How are you feeling?' },
      { type: 'chat', id: 'w4chat', title: 'My day, my way', domains: ['habits', 'digital', 'decisions'], turns: [
        { key: 'routine', say: 'Hi {name}! Tell me about your evenings. What do you usually do after school?', domain: 'habits' },
        { key: 'screen', say: 'What do you like to do on phones, tablets or TV? About how long do you spend on screens in a day?', domain: 'digital' },
        { key: 'sleep', say: 'What time do you usually go to sleep, and do you wake up feeling fresh?', domain: 'habits' },
        { key: 'goal', say: 'If you could get better at one thing this month, what would it be, and what is one small step you could take?', domain: 'decisions' }
      ] },
      { type: 'scenario', id: 'w4s1', domain: 'digital', text: 'A game asks for your full name, school and home address to give you free coins.', opts: [
        { t: 'Never share that. Close it and tell a parent', s: 4 }, { t: 'Share only my school name', s: 2 }, { t: 'Share everything, free coins!', s: 1 }, { t: 'Ask a parent if it is safe', s: 3 }] },
      { type: 'scenario', id: 'w4s2', domain: 'habits', text: 'You feel very sleepy in class most mornings.', opts: [
        { t: 'Go to bed earlier and keep screens away at night', s: 4 }, { t: 'Drink lots of cold drinks to stay awake', s: 1 }, { t: 'Tell my parents so we can fix my routine', s: 3 }, { t: 'Sleep in class', s: 1 }] },
      { type: 'scenario', id: 'w4s3', domain: 'digital', text: 'You have been playing a game for two hours and your eyes hurt.', opts: [
        { t: 'Stop, rest my eyes and go play outside', s: 4 }, { t: 'Just one more level', s: 2 }, { t: 'Turn the brightness up', s: 1 }, { t: 'Set a timer next time to take breaks', s: 3 }] },
      { type: 'scenario', id: 'w4s4', domain: 'decisions', text: 'You have homework, a friend’s birthday party, and a cricket match on the same day.', opts: [
        { t: 'Make a plan: homework first, then the party, match on the weekend', s: 4 }, { t: 'Skip the homework', s: 1 }, { t: 'Try to do everything and get stressed', s: 2 }, { t: 'Ask a parent to help me decide', s: 3 }] },
      { type: 'scenario', id: 'w4s5', domain: 'digital', text: 'Someone you do not know messages you online and asks for a photo.', opts: [
        { t: 'Do not reply, block them and tell a trusted adult', s: 4 }, { t: 'Send a photo, they seem friendly', s: 1 }, { t: 'Chat a bit to find out who they are', s: 1 }, { t: 'Just ignore it', s: 2 }] },
      { type: 'scenario', id: 'w4s6', domain: 'habits', text: 'Your lunch box has vegetables, but your friend has chips and offers to swap.', opts: [
        { t: 'Eat my healthy lunch, maybe share a few chips', s: 4 }, { t: 'Swap every day', s: 1 }, { t: 'Throw my lunch away', s: 1 }, { t: 'Swap sometimes, but not always', s: 3 }] },
      { type: 'scenario', id: 'w4s7', domain: 'decisions', text: 'You find a wallet with money on the playground.', opts: [
        { t: 'Give it to a teacher so they can find the owner', s: 4 }, { t: 'Keep the money', s: 1 }, { t: 'Leave it there', s: 2 }, { t: 'Ask friends whose it is', s: 3 }] },
      { type: 'scenario', id: 'w4s8', domain: 'habits', text: 'It is the holidays. You could stay in bed with your phone all day, or…', opts: [
        { t: 'Make a fun plan: play outside, a hobby, some reading', s: 4 }, { t: 'Phone all day, every day', s: 1 }, { t: 'Phone in the morning, then go out', s: 3 }, { t: 'Do nothing and feel bored', s: 2 }],
        alt: { s: { text: 'Between studies, coaching and phone, you rarely have time for friends, sleep or hobbies.', opts: [{ t: 'Plan my week with time for rest, friends and a hobby', s: 4 }, { t: 'Cut sleep to fit everything in', s: 1 }, { t: 'Talk to my family about a better balance', s: 3 }, { t: 'Just keep going, it will be fine', s: 2 }] } } },
      { type: 'rate', id: 'w4r1', domain: 'habits', text: 'I get enough sleep and feel fresh in the morning.' },
      { type: 'rate', id: 'w4r2', domain: 'digital', text: 'I find it hard to stop using screens once I start.', reverse: true },
      { type: 'rate', id: 'w4r3', domain: 'habits', text: 'I play outside or move my body every day.' },
      { type: 'rate', id: 'w4r4', domain: 'decisions', text: 'I think about what could happen before I do something.' },
      { type: 'rate', id: 'w4r5', domain: 'digital', text: 'I know what information I should never share online.' },
      { type: 'rate', id: 'w4r6', domain: 'decisions', text: 'I have a goal I am working towards.' },
      { type: 'story', id: 'w4story', title: 'Zoya’s Screen Monster', domains: ['digital', 'habits', 'decisions'], scenes: [
        { bg: 'night', line: 'It is 11 o’clock at night. Zoya is still watching videos on her tablet. "Just one more," she says, again and again.', chars: [{ n: 'Zoya', c: '#FFC93C', mood: 'neutral', x: 320 }] },
        { bg: 'class', line: 'The next morning, Zoya yawns all through class. She forgets her homework and snaps at her best friend.', chars: [{ n: 'Zoya', c: '#FFC93C', mood: 'sleepy', x: 260 }, { n: 'Meera', c: '#FF6FB5', mood: 'sad', x: 440 }] },
        { stop: { q: 'Why do you think Zoya is having a bad day?', domain: 'habits', opts: [{ t: 'She did not get enough sleep because of screen time', s: 4 }, { t: 'Her friend was mean', s: 1 }, { t: 'School is boring', s: 1 }, { t: 'She was tired', s: 3 }] } },
        { bg: 'home', line: 'That evening, a message pops up: "You won a free phone! Click here and type your password." Zoya’s finger moves to the link.', chars: [{ n: 'Zoya', c: '#FFC93C', mood: 'surprised', x: 320 }] },
        { stop: { q: 'What should Zoya do with this message?', domain: 'digital', opts: [{ t: 'Not click, and show it to a parent', s: 4 }, { t: 'Click quickly before it disappears', s: 1 }, { t: 'Send it to her friends too', s: 1 }, { t: 'Delete it', s: 3 }] } },
        { bg: 'home', line: 'Zoya shows her mother. They decide together: screens go to the kitchen at 9 pm, and Saturday is cycling day.', chars: [{ n: 'Zoya', c: '#FFC93C', mood: 'happy', x: 260 }, { n: 'Mother', c: '#FF6B6B', mood: 'happy', x: 430, adult: true }] },
        { stop: { q: 'Which plan would work best for YOU?', domain: 'decisions', opts: [{ t: 'A screen time limit plus a fun offline activity', s: 4 }, { t: 'No plan, I will just try', s: 2 }, { t: 'Screens whenever I want', s: 1 }, { t: 'A family screen-free hour', s: 4 }] } },
        { bg: 'park', line: 'A week later, Zoya sleeps well, laughs with Meera again, and has a new hobby: cycling!', chars: [{ n: 'Zoya', c: '#FFC93C', mood: 'wow', x: 280 }, { n: 'Meera', c: '#FF6FB5', mood: 'happy', x: 450 }] }
      ] },
      { type: 'focus', id: 'w4focus', level: 3 },
      { type: 'voice', id: 'w4v1', domain: 'decisions', key: 'goal', text: 'Tell me one goal for your well-being or growth this month, and one small step you can take.' },
      { type: 'breathe', id: 'w4b' },
      { type: 'memory', id: 'w4mem' },
      { type: 'voice', id: 'w4v2', domain: 'confidence', key: 'strength', text: 'What is a strength you are learning to value in yourself?' },
      { type: 'checkin', id: 'w4ci' },
      { type: 'mood', id: 'w4m1', when: 'end', say: 'You have finished the whole month! Amazing! How do you feel?' }
    ]
  }
];
/* ---------------- game missions ----------------
   Every game type from the first MindQuest (the 50-mission version) is played once every week.
   The games themselves live in arcade.js; this list is what the dashboards and reports need.
   m = which thinking skills a game measures (1 = main, 0.5 = supporting), est = seconds. */
const GAMES = {
  count: { name: 'Spot & Count', ic: 'search', est: 35, m: { EF: 1, Gq: .5 }, what: 'Selective attention · number sense' },
  listenPick: { name: 'Sound Quest', ic: 'headphones', est: 35, m: { Ga: 1, Gwm: .5 }, what: 'Auditory processing · auditory memory' },
  pattern: { name: 'Pattern Path', ic: 'puzzle', est: 30, m: { Gf: 1 }, what: 'Fluid reasoning (inductive)' },
  path: { name: 'Choose Your Path', ic: 'compass', est: 60, m: null, what: 'Personality (Big Five)' },
  simon: { name: 'Echo Pads', ic: 'piano', est: 40, m: { Gwm: 1 }, what: 'Working memory span' },
  emotion: { name: 'Feelings Detective', ic: 'mask', est: 45, m: null, what: 'Emotional intelligence' },
  spot: { name: 'Odd One Out', ic: 'eye', est: 25, m: { Gv: 1, Gs: .5 }, what: 'Visual discrimination · speed' },
  math: { name: 'Number Mission', ic: 'hash', est: 40, m: { Gq: 1, Gf: .5 }, what: 'Quantitative reasoning' },
  flash: { name: 'Flash Memory', ic: 'flash', est: 35, m: { Gwm: 1, Gv: .5 }, what: 'Visuospatial working memory' },
  beeps: { name: 'Sound Lab', ic: 'bell', est: 35, m: { Ga: 1 }, what: 'Auditory discrimination' },
  tapOrder: { name: 'Speed Tap', ic: 'bolt', est: 30, m: { Gs: 1, EF: .5 }, what: 'Processing speed · task switching' },
  riddle: { name: 'Brain Riddle', ic: 'bulb', est: 30, m: { Gf: 1, Gc: .5 }, what: 'Fluid reasoning (deductive) · verbal' },
  catch: { name: 'Quick Catch', ic: 'basket', est: 30, m: { EF: 1, Gs: .5 }, what: 'Inhibitory control · rule switching' },
  reading: { name: 'Read & Think', ic: 'scroll', est: 120, m: { Grw: 1, Gc: .5 }, what: 'Reading comprehension · inference' },
  audio: { name: 'Listen Closely', ic: 'ear', est: 100, m: { Gc: 1, Gwm: .5 }, what: 'Listening comprehension · listening attention' },
  describe: { name: 'Picture Talk', ic: 'image', est: 75, m: { Gr: 1, Gc: .5 }, what: 'Oral expression · idea fluency · observation' },
  speak: { name: 'Say It!', ic: 'mic', est: 60, m: { Gr: 1, Gc: .5 }, what: 'Verbal fluency' },
  fingers: { name: 'Finger Math', ic: 'hand', est: 45, m: { Gq: 1, Gs: .5 }, what: 'Quantitative reasoning (answer with fingers)' },
  quick: { name: 'Fastest Finger', ic: 'timer', est: 55, m: { Gs: 1, Gq: .5 }, what: 'Processing speed · number facts' }
};
const GAME_KINDS = { speak: ['letter', 'category', 'answer'], quick: ['facts', 'symbols'], path: ['p1', 'p2', 'p3', 'p4', 'p5'] };
const ABILITIES = {
  Gf: { label: 'Fluid Reasoning', ic: 'puzzle', desc: 'solving new problems by finding rules and patterns' },
  Gc: { label: 'Verbal Comprehension', ic: 'book', desc: 'understanding spoken language, stories and word links' },
  Gq: { label: 'Quantitative Reasoning', ic: 'hash', desc: 'reasoning with numbers and solving word problems' },
  Gwm: { label: 'Working Memory', ic: 'brain', desc: 'holding information in mind and working with it' },
  Gv: { label: 'Visual-Spatial Processing', ic: 'eye', desc: 'noticing visual details, positions and mirror images' },
  Ga: { label: 'Auditory Processing', ic: 'ear', desc: 'telling sounds apart and remembering what was heard' },
  Gs: { label: 'Processing Speed', ic: 'bolt', desc: 'doing simple tasks quickly and accurately' },
  EF: { label: 'Attention & Self-Control', ic: 'target', desc: 'focusing, ignoring distractions and switching rules' },
  Grw: { label: 'Reading Comprehension', ic: 'scroll', desc: 'reading a passage and understanding, inferring and judging what it says' },
  Gr: { label: 'Idea Fluency', ic: 'chat', desc: 'quickly finding words and ideas and putting them into speech' }
};
const BIG5_INFO = {
  O: { label: 'Openness', kid: 'Curiosity & Imagination', ic: 'wand', lo: 'Likes the familiar', hi: 'Curious & inventive' },
  C: { label: 'Conscientiousness', kid: 'Organised & Responsible', ic: 'check', lo: 'Easy-going', hi: 'Organised & dependable' },
  E: { label: 'Extraversion', kid: 'Social Energy', ic: 'clap', lo: 'Quiet & reflective', hi: 'Outgoing & energetic' },
  A: { label: 'Agreeableness', kid: 'Kindness & Cooperation', ic: 'heart', lo: 'Direct & competitive', hi: 'Warm & cooperative' },
  S: { label: 'Emotional Stability', kid: 'Calm Under Pressure', ic: 'sun', lo: 'Feels worries strongly', hi: 'Calm & resilient' }
};
const GAME_ORDER = ['count', 'listenPick', 'pattern', 'path', 'simon', 'emotion', 'spot', 'math', 'flash', 'beeps', 'tapOrder', 'riddle', 'catch', 'reading', 'audio', 'describe', 'speak', 'fingers', 'quick'];
/* this week's game missions: every type once; the variant and the content change week by week */
const gamePlan = n => GAME_ORDER.map(g => ({ game: g, key: GAME_KINDS[g] ? GAME_KINDS[g][(n - 1) % GAME_KINDS[g].length] : null, n: n - 1 }));

/* One week = the well-being questions written from the CBSE Holistic Well-being Report Card
   (mood, chat with Coggy, "What would you do?", "About me", the story video that pauses for questions,
   a calm breath, the private check-in) mixed with every game mission, about 25 minutes in all.
   The four week sets repeat after week 4 (week 5 = week 1 set) and the scenarios and "About me"
   lines rotate, so over the weeks every question from the sets is asked. */
function weekContent(n, grade) {
  const base = WEEKS[(n - 1) % WEEKS.length], st = stageOf(grade), round = Math.ceil(n / WEEKS.length);
  const all = base.items.filter(it => !it.stage || it.stage.includes(st)).map(it => {
    const a = it.alt && it.alt[st]; const o = a ? { ...it, ...a } : { ...it };
    if (it.stageText && it.stageText[st]) o.text = it.stageText[st];
    return o;
  });
  const of = t => all.filter(it => it.type === t);
  const rot = (list, k) => { if (!list.length) return []; const s = ((round - 1) * k) % list.length; return Array.from({ length: Math.min(k, list.length) }, (_, j) => list[(s + j) % list.length]); };
  const [mStart, mEnd] = [of('mood').find(m => m.when === 'start'), of('mood').find(m => m.when === 'end')];
  const chat = of('chat')[0], scen = rot(of('scenario'), 2), rate = rot(of('rate'), 3);
  const g = gamePlan(n).map((m, i) => ({ type: 'game', id: `w${n}g_${m.game}`, game: m }));
  const G = k => g.splice(0, k);
  const items = [mStart, chat && { ...chat, turns: rot(chat.turns, 2) }, ...G(3), scen[0], ...G(3), rate[0], of('story')[0], ...G(3), scen[1], of('breathe')[0], ...G(3), rate[1], ...G(3), rate[2], ...G(4), of('checkin')[0], mEnd].filter(Boolean);
  return { ...base, week: n, round, items };
}
const itemEst = it => it.type === 'game' ? GAMES[it.game.game].est : it.type === 'chat' ? 45 * (it.turns || []).length : TYPES[it.type] ? TYPES[it.type].est : 30;
const estMinutes = items => Math.round(items.reduce((s, it) => s + itemEst(it), 0) / 60);
const itemLabel = it => it.type === 'game' ? { label: GAMES[it.game.game].name, icon: GAMES[it.game.game].ic } : TYPES[it.type];

/* words that mean a child may need an adult's attention soon (handled sensitively, never shown to the child) */
const SAFETY_WORDS = /\b(kill myself|want to die|wanna die|hurt myself|cut myself|suicide|no one loves me|nobody loves me|hate my life|beat me|beats me|hits me|hit me|touch(es|ed)? me|abuse|unsafe at home|scared to go home|run away)\b/i;
const NEG_WORDS = /\b(sad|bad|angry|upset|scared|afraid|worried|worry|stress|stressed|tired|bored|alone|lonely|cry|cried|hate|fight|bully|bullied|tease|teased|nervous|fear|hard|difficult|boring|sick|hurt|mean)\b/gi;
const POS_WORDS = /\b(happy|good|great|fun|love|like|enjoy|nice|awesome|best|proud|excited|amazing|kind|friend|friends|play|won|win|cool|fine|okay|ok|better|calm|helped|help)\b/gi;
const TRUST_WORDS = /\b(mom|mum|mother|mummy|mama|dad|father|papa|daddy|parent|parents|teacher|ma'?am|sir|miss|grandma|grandpa|nani|nana|dadi|dada|aunt|uncle|brother|sister|bhaiya|didi|counsellor|counselor|friend|principal)\b/i;
const EMOTIONS = ['happy', 'neutral', 'surprised', 'sad', 'angry', 'fearful', 'disgusted'];
const EMO_META = { happy: { label: 'Happy', c: '#F59E0B' }, neutral: { label: 'Calm', c: '#94A3B8' }, surprised: { label: 'Surprised', c: '#8B5CF6' }, sad: { label: 'Sad', c: '#3B82F6' }, angry: { label: 'Annoyed', c: '#EF4444' }, fearful: { label: 'Worried', c: '#14B8A6' }, disgusted: { label: 'Uneasy', c: '#84CC16' } };
