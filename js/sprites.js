// js/sprites.js
// Pet stage descriptor data — used by PetRenderer to size and feature the pet

var PET_STAGES = [
  {
    // Stage 0: 알 — cream egg, no features
    name: '알',
    bodyW: 70, bodyH: 90, bodyRadius: '45%',
    hasEyes: false, hasFeet: false,
    color: 0xf8e8d0, strokeColor: 0xd8b898,
  },
  {
    // Stage 1: 갓 태어남 — tiny pale-yellow round blob, big eyes only
    name: '갓 태어남',
    bodyW: 72, bodyH: 72, bodyRadius: '50%',
    hasEyes: true, hasFeet: false,
    color: 0xf8f0c0, strokeColor: 0xe0d090, eyeSize: 13,
  },
  {
    // Stage 2: 아기 — slightly larger, soft pink tint, tiny feet
    name: '아기',
    bodyW: 80, bodyH: 82, bodyRadius: '48%',
    hasEyes: true, hasFeet: true,
    color: 0xf8d8c8, strokeColor: 0xe0b0a0, eyeSize: 13,
  },
  {
    // Stage 3: 호기심쟁이 — peach, visible ears poking up
    name: '호기심쟁이',
    bodyW: 84, bodyH: 88, bodyRadius: '45%',
    hasEyes: true, hasFeet: true, hasEars: true,
    color: 0xf8c8a8, strokeColor: 0xe0a880, eyeSize: 13,
  },
  {
    // Stage 4: 말하기 시작 — taller warm-orange body, ears + feet
    name: '말하기 시작',
    bodyW: 86, bodyH: 96, bodyRadius: '44%',
    hasEyes: true, hasFeet: true, hasEars: true,
    color: 0xf0b888, strokeColor: 0xd89060, eyeSize: 13,
  },
  {
    // Stage 5: 수다쟁이 — rosy coral, arms out
    name: '수다쟁이',
    bodyW: 92, bodyH: 100, bodyRadius: '43%',
    hasEyes: true, hasFeet: true, hasEars: true, hasArms: true,
    color: 0xe8a898, strokeColor: 0xc88070, eyeSize: 12,
  },
  {
    // Stage 6: 글자 요리사 — lavender, arms + crown
    name: '글자 요리사',
    bodyW: 94, bodyH: 106, bodyRadius: '42%',
    hasEyes: true, hasFeet: true, hasEars: true, hasArms: true, hasCrown: true,
    color: 0xd0b8e8, strokeColor: 0xb090c8, eyeSize: 12,
  },
  {
    // Stage 7: 다 큰 펫 — sky blue, full features + wings
    name: '다 큰 펫',
    bodyW: 100, bodyH: 112, bodyRadius: '42%',
    hasEyes: true, hasFeet: true, hasEars: true, hasArms: true, hasCrown: true, hasWings: true,
    color: 0xa8d0f0, strokeColor: 0x80b0d8, eyeSize: 13,
  },
];
