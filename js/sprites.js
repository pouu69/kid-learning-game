// js/sprites.js
// Pet stage descriptor data — used by PetRenderer to size and feature the pet
// Pixel-art style: smaller bodies with chunky rect-based rendering

var PET_STAGES = [
  { name: '알', bodyW: 60, bodyH: 72, hasEyes: false, hasFeet: false,
    color: 0xf8e8d0, strokeColor: 0xd8b898, strokeW: 4 },
  { name: '갓 태어남', bodyW: 64, bodyH: 64, hasEyes: true, hasFeet: false,
    color: 0xf8f0c0, strokeColor: 0xe0d090, strokeW: 4, eyeSize: 8 },
  { name: '아기', bodyW: 68, bodyH: 70, hasEyes: true, hasFeet: true,
    color: 0xf8d8c8, strokeColor: 0xe0b0a0, strokeW: 4, eyeSize: 8 },
  { name: '호기심쟁이', bodyW: 72, bodyH: 76, hasEyes: true, hasFeet: true, hasEars: true,
    color: 0xf8c878, strokeColor: 0xd09840, strokeW: 4, eyeSize: 9 },
  { name: '말하기 시작', bodyW: 76, bodyH: 82, hasEyes: true, hasFeet: true, hasEars: true,
    color: 0xf0b888, strokeColor: 0xd89060, strokeW: 4, eyeSize: 9 },
  { name: '수다쟁이', bodyW: 80, bodyH: 88, hasEyes: true, hasFeet: true, hasEars: true, hasArms: true,
    color: 0xe8a898, strokeColor: 0xc88070, strokeW: 4, eyeSize: 9 },
];
