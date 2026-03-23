// js/sprites.js
// Pet stage descriptor data — used by PetRenderer to size and feature the pet

var PET_STAGES = [
  {
    // Stage 0: 알 — cream egg, no features
    name: '알',
    bodyW: 120, bodyH: 155, bodyRadius: '45%',
    hasEyes: false, hasFeet: false,
    color: 0xf8e8d0, strokeColor: 0xd8b898,
  },
  {
    // Stage 1: 갓 태어남 — pale-yellow round blob, big eyes only
    name: '갓 태어남',
    bodyW: 125, bodyH: 125, bodyRadius: '50%',
    hasEyes: true, hasFeet: false,
    color: 0xf8f0c0, strokeColor: 0xe0d090, eyeSize: 20,
  },
  {
    // Stage 2: 아기 — soft pink tint, tiny feet
    name: '아기',
    bodyW: 138, bodyH: 142, bodyRadius: '48%',
    hasEyes: true, hasFeet: true,
    color: 0xf8d8c8, strokeColor: 0xe0b0a0, eyeSize: 20,
  },
  {
    // Stage 3: 호기심쟁이 — peach, visible ears poking up
    name: '호기심쟁이',
    bodyW: 145, bodyH: 152, bodyRadius: '45%',
    hasEyes: true, hasFeet: true, hasEars: true,
    color: 0xf8c8a8, strokeColor: 0xe0a880, eyeSize: 20,
  },
  {
    // Stage 4: 말하기 시작 — taller warm-orange body, ears + feet
    name: '말하기 시작',
    bodyW: 150, bodyH: 166, bodyRadius: '44%',
    hasEyes: true, hasFeet: true, hasEars: true,
    color: 0xf0b888, strokeColor: 0xd89060, eyeSize: 20,
  },
  {
    // Stage 5: 수다쟁이 — rosy coral, arms out
    name: '수다쟁이',
    bodyW: 160, bodyH: 174, bodyRadius: '43%',
    hasEyes: true, hasFeet: true, hasEars: true, hasArms: true,
    color: 0xe8a898, strokeColor: 0xc88070, eyeSize: 19,
  },
  {
    // Stage 6: 글자 요리사 — lavender, arms + crown
    name: '글자 요리사',
    bodyW: 164, bodyH: 184, bodyRadius: '42%',
    hasEyes: true, hasFeet: true, hasEars: true, hasArms: true, hasCrown: true,
    color: 0xd0b8e8, strokeColor: 0xb090c8, eyeSize: 19,
  },
  {
    // Stage 7: 다 큰 펫 — sky blue, full features + wings
    name: '다 큰 펫',
    bodyW: 174, bodyH: 194, bodyRadius: '42%',
    hasEyes: true, hasFeet: true, hasEars: true, hasArms: true, hasCrown: true, hasWings: true,
    color: 0xa8d0f0, strokeColor: 0x80b0d8, eyeSize: 20,
  },
];
