// Monster.handler.js
import { PACKET_TYPES } from '../constants/packetTypes.js';
import { packetParser } from '../utils/parser/packetParser.js';
import { handlerError } from '../utils/error/errorHandler.js';
import fs from 'fs';
import path from 'path';

// JSON 데이터 로드 함수
function loadJSONData(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data).data;
  } catch (err) {
    console.error(`${filePath}에서 데이터를 불러오는데 실패했습니다:`, err);
    return [];
  }
}

// JSON 데이터 로드
const monsterData = loadJSONData(path.join(__dirname, 'assets', 'monster.json'));
const stageData = loadJSONData(path.join(__dirname, 'assets', 'stage.json'));

// 현재 게임 상태 관리 객체
const gameState = {
  monsters: [],
  gold: 0,
  score: 0,
  stageId: 101,
  timestamp: 0,
};

// 패킷 파싱 함수
function parseGamePacket(buffer) {
  const { packetType, version, sequence, payload } = packetParser(buffer);
  return { packetType, version, sequence, payload };
}

// 몬스터 생성 요청 검증 및 처리
async function handleSpawnMonsterRequest(socket, payload) {
  const { monsterId, x, y } = payload;

  const stage = stageData.find(s => s.id === gameState.stageId && s.monster_id === monsterId);
  if (!stage) {
    return socket.write(Buffer.from(`현재 스테이지에 맞지 않는 몬스터입니다.`));
  }

  const monster = monsterData.find(m => m.id === monsterId);
  if (!monster) {
    return socket.write(Buffer.from(`해당 몬스터의 데이터를 찾을 수 없습니다.`));
  }

  const spawnedMonster = {
    id: monster.id,
    hp: monster.hp,
    attackPower: monster.attackPower,
    position: { x, y },
    gold: monster.gold,
    score: monster.score,
    speed: monster.speed,
  };

  gameState.monsters.push(spawnedMonster);
  console.log(`몬스터 ${monster.id}가 생성되었습니다. 체력: ${monster.hp}, 공격력: ${monster.attackPower}`);

  socket.write(Buffer.from(`몬스터 ${monster.id} 생성 완료!`));
}

// 몬스터 사망 처리 및 골드, 점수 업데이트
async function handleMonsterDeath(socket, payload) {
  const { monsterId } = payload;
  const monsterIndex = gameState.monsters.findIndex(m => m.id === monsterId);

  if (monsterIndex === -1) {
    return socket.write(Buffer.from(`몬스터를 찾을 수 없습니다.`));
  }

  const monster = gameState.monsters[monsterIndex];
  gameState.monsters.splice(monsterIndex, 1);
  gameState.gold += monster.gold;
  gameState.score += monster.score;
  console.log(`몬스터 ${monsterId}가 사망했습니다. 골드: +${monster.gold}, 점수: +${monster.score}`);

  socket.write(Buffer.from(`몬스터 ${monsterId} 사망 처리 완료.`));
}

// 상태 동기화 처리
async function handleStateSync(socket) {
  try {
    const response = {
      userGold: gameState.gold,
      baseHp: gameState.base.hp,
      monsterLevel: gameState.monsterLevel,
      score: gameState.score,
      towers: gameState.towers,
      monsters: gameState.monsters,
    };
    socket.write(Buffer.from(JSON.stringify(response)));
  } catch (err) {
    handlerError(socket, err);
  }
}

// GamePacket의 payload 타입에 따른 요청 처리
export async function handleGamePacket(socket, buffer) {
  try {
    const { packetType, payload } = parseGamePacket(buffer);

    switch (packetType) {
      case PACKET_TYPES.SPAWN_MONSTER_REQUEST:
        await handleSpawnMonsterRequest(socket, payload);
        break;
      case PACKET_TYPES.MONSTER_DEATH_NOTIFICATION:
        await handleMonsterDeath(socket, payload);
        break;
      case PACKET_TYPES.STATE_SYNC_NOTIFICATION:
        await handleStateSync(socket);
        break;
      default:
        console.log("알 수 없는 패킷 타입입니다. 게임 패킷 요청을 처리할 수 없습니다.");
        break;
    }
  } catch (err) {
    console.error("GamePacket을 처리하는 중 오류가 발생했습니다:", err);
    handlerError(socket, err);
  }
}
