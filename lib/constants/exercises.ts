import { ExerciseVariation, FormCues, MovementCategory } from "@/types";

export const EXERCISE_VARIATIONS: Record<MovementCategory, ExerciseVariation[]> = {
  push: [
    { id: "wall-pushups", name: "Wall Push-ups", difficulty: 1, isStandard: false },
    { id: "incline-pushups", name: "Incline Push-ups", difficulty: 2, isStandard: false },
    { id: "knee-pushups", name: "Knee Push-ups", difficulty: 3, isStandard: false },
    { id: "regular-pushups", name: "Regular Push-ups", difficulty: 4, isStandard: true },
    { id: "weighted-pushups", name: "Weighted Push-ups", difficulty: 5, isStandard: true },
    { id: "archer-pushups", name: "Archer Push-ups", difficulty: 6, isStandard: true },
    { id: "one-arm-pushups", name: "One Arm Push-ups", difficulty: 7, isStandard: true },
  ],
  pull: [
    { id: "incline-rows", name: "Incline Rows", difficulty: 1, isStandard: false },
    {
      id: "australian-pullups",
      name: "Australian Pull-ups",
      difficulty: 2,
      isStandard: false,
    },
    { id: "jumping-pullups", name: "Jumping Pull-ups", difficulty: 3, isStandard: false },
    {
      id: "band-assisted-pullups",
      name: "Band Assisted Pull-ups",
      difficulty: 4,
      isStandard: false,
    },
    { id: "regular-pullups", name: "Regular Pull-ups", difficulty: 5, isStandard: true },
    { id: "weighted-pullups", name: "Weighted Pull-ups", difficulty: 6, isStandard: true },
    { id: "archer-pullups", name: "Archer Pull-ups", difficulty: 7, isStandard: true },
    { id: "one-arm-pullups", name: "One Arm Pull-ups", difficulty: 8, isStandard: true },
  ],
  legs: [
    { id: "chair-squat", name: "Chair Squat", difficulty: 1, isStandard: false },
    { id: "assisted-squats", name: "Assisted Squats", difficulty: 2, isStandard: false },
    { id: "horse-stance", name: "Horse Stance", difficulty: 3, isStandard: false },
    { id: "bodyweight-squats", name: "Bodyweight Squats", difficulty: 4, isStandard: true },
    { id: "bulgarian-split-squat", name: "Bulgarian Split Squat", difficulty: 5, isStandard: true },
    {
      id: "forward-walking-lunges",
      name: "Forward Walking Lunges",
      difficulty: 6,
      isStandard: true,
    },
    { id: "backwards-lunges", name: "Backwards Lunges", difficulty: 7, isStandard: true },
    { id: "jump-squats", name: "Jump Squats", difficulty: 8, isStandard: true },
    { id: "pistol-squats", name: "Pistol Squats", difficulty: 9, isStandard: true },
    { id: "weighted-squats", name: "Weighted Squats", difficulty: 10, isStandard: true },
  ],
};

/**
 * FORM_CUES: Exercise form guidance and media
 *
 * To add GIF demonstrations:
 * 1. Upload your GIF to Uploadthing
 * 2. Add the gifUrl field with your Uploadthing URL
 *
 * Example:
 *   gifUrl: "https://utfs.io/f/your-file-id.gif"
 */
export const FORM_CUES: Record<string, FormCues> = {
  "wall-pushups": {
    cues: [
      "Stand arm's length from wall",
      "Hands shoulder-width apart",
      "Lower chest to wall slowly (3 seconds)",
      "Push back to starting position",
      "Keep body straight throughout",
    ],
    // videoUrl: "https://www.youtube.com/embed/PLACEHOLDER_WALL_PUSHUP",
    gifUrl: "https://ei1bcw8zdb.ufs.sh/f/adJSRHiLPvNbSuaCGUojZRgXyLBUJPFr0zYsI67bT5uOeWjw",
  },
  "incline-pushups": {
    cues: [
      "Hands on elevated surface (bench, table)",
      "Body in straight line from head to heels",
      "Lower chest to surface (3 second descent)",
      "Elbows at 45-degree angle",
      "Push back up with control",
    ],
    // videoUrl: "https://www.youtube.com/embed/PLACEHOLDER_INCLINE_PUSHUP",
    gifUrl: "https://ei1bcw8zdb.ufs.sh/f/adJSRHiLPvNbhddcabSjmaHIqPQVJCFztU8T7ygiZXevYps9",
  },
  "knee-pushups": {
    cues: [
      "Start in plank position on knees",
      "Hands shoulder-width apart",
      "Maintain straight line from head to knees",
      "Lower chest to ground (3 seconds)",
      "Full lockout at top",
    ],
    // videoUrl: "https://www.youtube.com/embed/PLACEHOLDER_KNEE_PUSHUP",
    gifUrl: "https://ei1bcw8zdb.ufs.sh/f/adJSRHiLPvNb8QvtlQNRBUt5IyH9Cfnkes36EdpOcJWrFVh2",
  },
  "regular-pushups": {
    cues: [
      "Elbows close to body (not flared)",
      "Control the descent (3 second eccentric)",
      "Full lockout at top",
      "Chest touches ground or fist",
      "Maintain plank position (no sagging hips)",
    ],
    // videoUrl: "https://www.youtube.com/embed/PLACEHOLDER_REGULAR_PUSHUP",
    gifUrl: "https://ei1bcw8zdb.ufs.sh/f/adJSRHiLPvNbKJ8t7ZXdPBlcTFmYA23bzasuJftN4ovRW6VO",
  },
  "weighted-pushups": {
    //Todo: include additional weight logging in database. (maybe in combination with bodyweight? so that we can chart basically weight moved over time in addition with volume)
    cues: [
      "Place weight vest or plate on back",
      "Maintain strict form as regular push-ups",
      "3 second controlled descent",
      "Full range of motion",
      "Avoid shifting weight during movement",
    ],
    // videoUrl: "https://www.youtube.com/embed/PLACEHOLDER_WEIGHTED_PUSHUP",
    gifUrl: "https://ei1bcw8zdb.ufs.sh/f/adJSRHiLPvNb1dleMCFMqrxlOcSBybhfNYZHRvUCujDakEJF",
  },
  "archer-pushups": {
    cues: [
      "Wide hand placement",
      "Shift weight to one side as you descend",
      "Opposite arm stays straight",
      "3 second descent on working side",
      "Alternate sides each rep",
    ],
    // videoUrl: "https://www.youtube.com/embed/PLACEHOLDER_ARCHER_PUSHUP",
  },
  "one-arm-pushups": {
    cues: [
      "Feet wider than shoulder-width for stability",
      "One hand behind back",
      "Control descent with single arm (3 seconds)",
      "Minimize rotation in torso",
      "Full lockout at top",
    ],
    // videoUrl: "https://www.youtube.com/embed/PLACEHOLDER_ONE_ARM_PUSHUP",
    gifUrl: "https://ei1bcw8zdb.ufs.sh/f/adJSRHiLPvNbBVoZboVcMy92wOI6cZ3KshJAt8PurlkRqzXi",
  },
  "incline-rows": {
    cues: [
      "Use table or bar at waist height",
      "Body straight from heels to head",
      "Pull chest to bar",
      "Squeeze shoulder blades together",
      "Control descent (3 seconds)",
    ],
    // videoUrl: "https://www.youtube.com/embed/PLACEHOLDER_INCLINE_ROW",
  },
  "australian-pullups": {
    cues: [
      "Bar at hip height, body underneath",
      "Heels on ground, body straight",
      "Pull chest to bar",
      "3 second descent",
      "Full arm extension at bottom",
    ],
    // videoUrl: "https://www.youtube.com/embed/PLACEHOLDER_AUSTRALIAN_PULLUP",
    gifUrl: "https://ei1bcw8zdb.ufs.sh/f/adJSRHiLPvNbE1ZNx7p9LxuJXNrwO64dKgjaMTGCbYIV3B52"
  },
  "jumping-pullups": {
    cues: [
      "Use small jump to assist getting chin over bar",
      "Control the descent (3 seconds)",
      "Minimize jump assistance over time",
      "Focus on lowering phase",
      "Full dead hang at bottom",
    ],
    // videoUrl: "https://www.youtube.com/embed/PLACEHOLDER_JUMPING_PULLUP",
    gifUrl: "https://ei1bcw8zdb.ufs.sh/f/adJSRHiLPvNbjYFf6HPPwVgza0DFUiObCSYXJym1G5LKxqW3",
  },
  "band-assisted-pullups": {
    cues: [
      "Loop resistance band over bar",
      "Place knees or feet in band",
      "Pull chin over bar",
      "Control descent (3 seconds)",
      "Use lighter band as you progress",
    ],
    // videoUrl: "https://www.youtube.com/embed/PLACEHOLDER_BAND_ASSISTED_PULLUP",
    gifUrl: "https://ei1bcw8zdb.ufs.sh/f/adJSRHiLPvNbjO24ChPPwVgza0DFUiObCSYXJym1G5LKxqW3"
  },
  "regular-pullups": {
    cues: [
      "Dead hang at bottom (full extension)",
      "Pull until chin clears bar",
      "Control descent (3 second eccentric)",
      "No kipping or swinging",
      "Squeeze shoulder blades at top",
    ],
    // videoUrl: "https://www.youtube.com/embed/PLACEHOLDER_REGULAR_PULLUP",
    gifUrl: "https://ei1bcw8zdb.ufs.sh/f/adJSRHiLPvNbXHbzq5ut5heSTVWzrsvMZ1bpmPK3adJfND28",
  },
  "weighted-pullups": {
    cues: [
      "Use weight belt or vest",
      "Maintain strict form as regular pull-ups",
      "3 second controlled descent",
      "Full dead hang at bottom",
      "No momentum or swinging",
    ],
    // videoUrl: "https://www.youtube.com/embed/PLACEHOLDER_WEIGHTED_PULLUP",
    gifUrl: "https://ei1bcw8zdb.ufs.sh/f/adJSRHiLPvNbZlB0abQAca2tY3n5Uz6WHOGeCL9jN1kBbJvu",
  },
  "archer-pullups": {
    cues: [
      "Wide grip on bar",
      "Pull to one side, opposite arm straightens",
      "3 second descent",
      "Chin clears bar on working side",
      "Alternate sides each rep",
    ],
    // videoUrl: "https://www.youtube.com/embed/PLACEHOLDER_ARCHER_PULLUP",
  },
  "one-arm-pullups": {
    cues: [
      "Single hand on bar, opposite hand free or on wrist",
      "Pull chin over bar with one arm",
      "Minimize rotation",
      "3 second controlled descent",
      "Full dead hang at bottom",
    ],
    // videoUrl: "https://www.youtube.com/embed/PLACEHOLDER_ONE_ARM_PULLUP",
  },
  "chair-squat": {
    cues: [
      "Stand in front of chair",
      "Lower until touching chair (don't sit)",
      "Use chair as depth guide only",
      "3 second descent",
      "Stand back up with control",
    ],
    // videoUrl: "https://www.youtube.com/embed/PLACEHOLDER_CHAIR_SQUAT",
  },
  "assisted-squats": {
    cues: [
      "Hold onto door frame or TRX straps",
      "Lower into squat position",
      "Use arms minimally for assistance",
      "3 second descent",
      "Thighs parallel to ground",
    ],
    // videoUrl: "https://www.youtube.com/embed/PLACEHOLDER_ASSISTED_SQUAT",
  },
  "horse-stance": {
    cues: [
      "Feet wider than shoulder-width, toes pointing forward or slightly out",
      "Lower until thighs are parallel to ground",
      "Keep back straight and chest up",
      "Hold position for time (start with 30 seconds)",
      "Knees track over toes, don't collapse inward",
    ],
    // videoUrl: "https://www.youtube.com/embed/PLACEHOLDER_HORSE_STANCE",
  },
  "bodyweight-squats": {
    cues: [
      "Feet shoulder-width apart",
      "Lower until thighs parallel to ground",
      "3 second controlled descent",
      "Knees track over toes",
      "Full hip extension at top",
    ],
    // videoUrl: "https://www.youtube.com/embed/PLACEHOLDER_BODYWEIGHT_SQUAT",
    gifUrl: "https://ei1bcw8zdb.ufs.sh/f/adJSRHiLPvNbmC9KDsZH4Fp2xBVRWq1i3UZKJyszN8GCw9M5",
  },
  "bulgarian-split-squat": {
    cues: [
      "Rear foot elevated on bench",
      "Lower back knee toward ground",
      "Front knee stays over ankle",
      "3 second descent",
      "Drive through front heel to stand",
    ],
    // videoUrl: "https://www.youtube.com/embed/PLACEHOLDER_BULGARIAN_SPLIT_SQUAT",
  },
  "forward-walking-lunges": {
    cues: [
      "Step forward into lunge position",
      "Lower back knee toward ground (3 seconds)",
      "Front knee stays over ankle",
      "Drive through front heel and step forward with back leg",
      "Continue walking forward, alternating legs",
    ],
    // videoUrl: "https://www.youtube.com/embed/PLACEHOLDER_FORWARD_WALKING_LUNGE",
  },
  "backwards-lunges": {
    cues: [
      "Step backwards into lunge position",
      "Lower back knee toward ground (3 seconds)",
      "Front knee stays over ankle",
      "Drive through front heel to return to standing",
      "Alternate legs each rep",
    ],
    // videoUrl: "https://www.youtube.com/embed/PLACEHOLDER_BACKWARDS_LUNGE",
  },
  "jump-squats": {
    cues: [
      "Lower into squat (3 seconds)",
      "Explode up into jump",
      "Land softly with bent knees",
      "Immediately descend into next rep",
      "Maintain good squat form throughout",
    ],
    // videoUrl: "https://www.youtube.com/embed/PLACEHOLDER_JUMP_SQUAT",
  },
  "pistol-squats": {
    cues: [
      "Single leg squat, other leg extended forward",
      "Lower until hamstring touches calf (3 seconds)",
      "Keep extended leg off ground",
      "Arms forward for balance",
      "Drive through heel to stand",
    ],
    // videoUrl: "https://www.youtube.com/embed/PLACEHOLDER_PISTOL_SQUAT",
  },
  "weighted-squats": {
    cues: [
      "Hold dumbbells, barbell, or wear weight vest",
      "Maintain strict bodyweight squat form",
      "3 second controlled descent",
      "Thighs parallel or below",
      "Full hip extension at top",
    ],
    // videoUrl: "https://www.youtube.com/embed/PLACEHOLDER_WEIGHTED_SQUAT",
  },
};

// Get exercise by ID across all categories
export function getExerciseById(exerciseId: string): ExerciseVariation | null {
  for (const category of Object.keys(EXERCISE_VARIATIONS) as MovementCategory[]) {
    const exercise = EXERCISE_VARIATIONS[category].find((ex) => ex.id === exerciseId);
    if (exercise) return exercise;
  }
  return null;
}

// Get next difficulty exercise in the same category
export function getNextDifficultyExercise(
  currentExercise: ExerciseVariation,
  category: MovementCategory
): ExerciseVariation | null {
  const exercises = EXERCISE_VARIATIONS[category];
  const currentIndex = exercises.findIndex((ex) => ex.id === currentExercise.id);
  if (currentIndex === -1 || currentIndex === exercises.length - 1) return null;
  return exercises[currentIndex + 1];
}

// Get previous difficulty exercise in the same category
export function getPreviousDifficultyExercise(
  currentExercise: ExerciseVariation,
  category: MovementCategory
): ExerciseVariation | null {
  const exercises = EXERCISE_VARIATIONS[category];
  const currentIndex = exercises.findIndex((ex) => ex.id === currentExercise.id);
  if (currentIndex <= 0) return null;
  return exercises[currentIndex - 1];
}
