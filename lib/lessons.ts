type StepCopy = {
  id: string;
  title: string;
  instruction: string;
  minutes: number;
  tip?: string;
};

type StepKind = "tune" | "tap" | "chord" | "write" | "compare" | "hook" | "drill" | "practice";

export type LessonStep = StepCopy & { kind: StepKind };

export type Lesson = {
  id: string;
  stage: string;
  title: string;
  objective: string;
  steps: readonly [LessonStep, ...LessonStep[]];
  checkpoint: string;
  stallResponses: readonly string[];
};

const stalls = {
  buzz: "Move your finger just behind the metal fret and pluck one string at a time. If the chord still buzzes, play just its lowest note.",
  blank: "Name a place and an object you remember there. Say one sentence you would actually say about it.",
  stress: "Clap the words you naturally stress. If the line feels crowded, drop a syllable or move one word to the next beat.",
  coordination: "Record your guitar first. Then record your voice on its own.",
  perfectionism: "Make two takes, then listen. Keep the one you want to hear again.",
  resume: "Play your last recording and pick one small thing to try today.",
};

export const stageZero: Lesson = {
  id: "stage-0",
  stage: "Stage 0",
  title: "Your first session",
  objective: "Play, write, and record a short hook of your own.",
  steps: [
    {
      id: "tune", kind: "tune", title: "Tune your guitar", minutes: 3,
      instruction: "Start with the thickest string. Play its reference note, then pluck your string and turn its tuning peg a little at a time until the pitches match. Work toward the thinnest string.",
    },
    {
      id: "tap", kind: "tap", title: "Find four steady beats", minutes: 2,
      instruction: "Count 1, 2, 3, 4 out loud. Tap once on each number and try to leave the same amount of time between taps.",
      tip: "You can tap with your thumb or press Space when the Tap button has focus.",
    },
    {
      id: "em", kind: "chord", title: "Play your first chord", minutes: 2,
      instruction: "Put your middle finger on the second fret of the A string and your ring finger on the second fret of the D string. Keep the other strings open. Strum all six strings once.",
      tip: stalls.buzz,
    },
    {
      id: "line", kind: "write", title: "Write one line", minutes: 3,
      instruction: "Think of one concrete memory. Picture where you were and one thing you saw, heard, or touched. Say one line about it in your own words.",
      tip: stalls.blank,
    },
    {
      id: "rhythms", kind: "compare", title: "Hum it two ways", minutes: 3,
      instruction: "Hum the shape of your line twice. In the first take, keep the syllables close together. In the second, leave a pause before your most important word. Play both takes and keep the rhythm you prefer.",
      tip: stalls.stress,
    },
    {
      id: "hook", kind: "hook", title: "Record your hook", minutes: 2,
      instruction: "Aim for 10 to 20 seconds. Play Em once, then sing or say your line in the rhythm you kept. You can play the chord and say the line one after the other. Play back your take.",
      tip: stalls.perfectionism,
    },
  ],
  checkpoint: "Keep a 10 to 20 second personal hook you can play back.",
  stallResponses: [stalls.buzz, stalls.blank, stalls.stress, stalls.coordination, stalls.perfectionism],
};

export const weekOne: Lesson = {
  id: "week-1",
  stage: "Week 1",
  title: "A repeatable hook",
  objective: "Build a hook you can play again tomorrow.",
  steps: [
    {
      id: "downstrokes", kind: "drill", title: "Four slow downstrokes", minutes: 3,
      instruction: "Relax the hand holding your chord. Hold Em and brush down across the strings once per beat. Start at 60 beats per minute and repeat when you are ready.",
      tip: stalls.buzz,
    },
    {
      id: "title", kind: "practice", title: "Find a title line", minutes: 4,
      instruction: "Pick an object. Write four details you can sense, such as its color, sound, or texture. Turn one detail into your title line.",
      tip: stalls.blank,
    },
    {
      id: "melody", kind: "practice", title: "Try two or three notes", minutes: 4,
      instruction: "Hum your title line on two or three notes. Find the key word and try the phrase again, giving that word room.",
      tip: stalls.stress,
    },
    {
      id: "memo", kind: "practice", title: "Make a four-bar memo", minutes: 4,
      instruction: "Play four groups of four beats as you sing or say your line. Save a four-bar recording and write down your lyric.",
      tip: stalls.coordination,
    },
  ],
  checkpoint: "Keep a four-bar memo and a written lyric. Check if you can repeat the hook tomorrow and name its key word.",
  stallResponses: [stalls.buzz, stalls.blank, stalls.stress, stalls.coordination, stalls.resume],
};

export const course: readonly Lesson[] = [
  stageZero,
  weekOne,
  {
    id: "week-2", stage: "Week 2", title: "Accompany a verse",
    objective: "Keep the beat while you change chords and speak a verse.",
    steps: [
      { id: "change", kind: "practice", title: "Change to a second chord", minutes: 5, instruction: "Try Asus2. Practice the change on its own, then give each chord a full bar of four beats." },
      { id: "scene", kind: "practice", title: "Speak a four-line scene", minutes: 5, instruction: "Mark the words you stress. Speak the scene in time and leave room to breathe." },
    ],
    checkpoint: "Keep an eight-bar verse and chord sheet. Check that you can make one clean change and keep the pulse.",
    stallResponses: [stalls.buzz, stalls.stress, stalls.resume],
  },
  {
    id: "week-3", stage: "Week 3", title: "A chorus that sounds different",
    objective: "Make a chorus a listener can tell apart from the verse.",
    steps: [
      { id: "contrast", kind: "practice", title: "Change one thing in the chorus", minutes: 5, instruction: "Pick a higher resting note, a longer title note, or a fuller strum." },
      { id: "rhyme", kind: "practice", title: "Listen to two rhymes", minutes: 5, instruction: "Compare two rhymes by ear. Replace one vague phrase with a detail from the verse." },
    ],
    checkpoint: "Keep a verse and chorus a listener can tell apart. Use this as your first personal checkpoint.",
    stallResponses: [stalls.blank, stalls.stress, stalls.resume],
  },
  {
    id: "week-4", stage: "Week 4", title: "Finish the draft",
    objective: "Play your song from beginning to end.",
    steps: [
      { id: "form", kind: "practice", title: "Put the sections in order", minutes: 5, instruction: "Use verse, chorus, verse, chorus. Add a bridge if you want. Change the time, place, or perspective in verse two and keep the hook." },
      { id: "finish", kind: "practice", title: "Practice the start and end", minutes: 5, instruction: "Count in and choose how you want the last note or chord to end." },
    ],
    checkpoint: "Keep a start-to-finish take and a one-page chord and lyric sheet.",
    stallResponses: [stalls.coordination, stalls.perfectionism, stalls.resume],
  },
  {
    id: "week-5", stage: "Week 5", title: "Arrange and revise",
    objective: "Decide where the song gets louder or softer and revise one thing by ear.",
    steps: [
      { id: "map", kind: "practice", title: "Mark where the strumming changes", minutes: 5, instruction: "Choose where the strumming gets lighter or stops. Check that the speed and singing range feel comfortable." },
      { id: "versions", kind: "practice", title: "Record two chorus versions", minutes: 5, instruction: "Listen to both chorus takes and adjust one thing. Save both takes." },
    ],
    checkpoint: "Keep both chorus takes and a map of where you changed the strumming.",
    stallResponses: [stalls.perfectionism, stalls.resume],
  },
  {
    id: "week-6", stage: "Week 6", title: "Record and export",
    objective: "Make a playable recording and back it up.",
    steps: [
      { id: "test", kind: "practice", title: "Test your sound", minutes: 5, instruction: "Find a quiet room, record a short test, and check that you can hear the guitar and voice clearly." },
      { id: "export", kind: "practice", title: "Record and trim a full take", minutes: 5, instruction: "Count in and play the whole song. Record voice and guitar separately if needed. Trim the recording and make a backup." },
    ],
    checkpoint: "Keep a playable audio file, a lyric and chord sheet, and a backup.",
    stallResponses: [stalls.coordination, stalls.perfectionism, stalls.resume],
  },
  {
    id: "weeks-7-8", stage: "Optional weeks 7 and 8", title: "Layers and mix",
    objective: "Make a layered recording and start your second song.",
    steps: [
      { id: "layers", kind: "practice", title: "Record the layers", minutes: 5, instruction: "Use a recording program. Record a guide memo, then rhythm guitar and a vocal with headphones. Add at most one harmony." },
      { id: "mix", kind: "practice", title: "Balance and export", minutes: 5, instruction: "Balance the tracks and remove noise. Export a listening copy and a master, then start your second song." },
    ],
    checkpoint: "Keep a listening copy and a master. Start song two.",
    stallResponses: [stalls.perfectionism, stalls.resume],
  },
];
