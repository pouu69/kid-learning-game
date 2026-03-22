// js/sprites.js
// Pet stage descriptor data — used by PetRenderer to size and feature the pet

var PET_STAGES = [
  {
    name: '알',
    bodyW: 70, bodyH: 90, bodyRadius: '45%',
    hasEyes: false, hasFeet: false,
    color: 0xf8e8d0,
  },
  {
    name: '갓 태어남',
    bodyW: 80, bodyH: 80, bodyRadius: '50%',
    hasEyes: true, hasFeet: false,
    color: 0xf8e8d0, eyeSize: 12,
  },
  {
    name: '아기',
    bodyW: 85, bodyH: 85, bodyRadius: '48%',
    hasEyes: true, hasFeet: true,
    color: 0xf8e8d0, eyeSize: 13,
  },
  {
    name: '호기심쟁이',
    bodyW: 90, bodyH: 90, bodyRadius: '45%',
    hasEyes: true, hasFeet: true, hasEars: true,
    color: 0xf8e8d0, eyeSize: 14,
  },
  {
    name: '말하기 시작',
    bodyW: 90, bodyH: 95, bodyRadius: '44%',
    hasEyes: true, hasFeet: true, hasEars: true,
    color: 0xf8e8d0, eyeSize: 14,
  },
  {
    name: '수다쟁이',
    bodyW: 95, bodyH: 100, bodyRadius: '43%',
    hasEyes: true, hasFeet: true, hasEars: true, hasArms: true,
    color: 0xf8e8d0, eyeSize: 13,
  },
  {
    name: '글자 요리사',
    bodyW: 95, bodyH: 105, bodyRadius: '42%',
    hasEyes: true, hasFeet: true, hasEars: true, hasArms: true, hasCrown: true,
    color: 0xf8e8d0, eyeSize: 13,
  },
  {
    name: '다 큰 펫',
    bodyW: 100, bodyH: 110, bodyRadius: '42%',
    hasEyes: true, hasFeet: true, hasEars: true, hasArms: true, hasCrown: true, hasWings: true,
    color: 0xf8e8d0, eyeSize: 14,
  },
];
