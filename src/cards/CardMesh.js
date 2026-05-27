import * as THREE from 'three';
import { SUIT_COLORS, SUIT_SYMBOLS } from './Deck.js';

/* ============================================================
   Pip layout positions for number cards (normalized 0-1)
   Based on standard playing card pip patterns
   ============================================================ */
const PIP_LAYOUTS = {
    '2':  [[0.5,0.25],[0.5,0.75]],
    '3':  [[0.5,0.2],[0.5,0.5],[0.5,0.8]],
    '4':  [[0.3,0.25],[0.7,0.25],[0.3,0.75],[0.7,0.75]],
    '5':  [[0.3,0.25],[0.7,0.25],[0.5,0.5],[0.3,0.75],[0.7,0.75]],
    '6':  [[0.3,0.2],[0.7,0.2],[0.3,0.5],[0.7,0.5],[0.3,0.8],[0.7,0.8]],
    '7':  [[0.3,0.2],[0.7,0.2],[0.5,0.35],[0.3,0.5],[0.7,0.5],[0.3,0.8],[0.7,0.8]],
    '8':  [[0.3,0.2],[0.7,0.2],[0.5,0.35],[0.3,0.5],[0.7,0.5],[0.5,0.65],[0.3,0.8],[0.7,0.8]],
    '9':  [[0.3,0.18],[0.7,0.18],[0.3,0.38],[0.7,0.38],[0.5,0.5],[0.3,0.62],[0.7,0.62],[0.3,0.82],[0.7,0.82]],
    '10': [[0.3,0.15],[0.7,0.15],[0.5,0.27],[0.3,0.38],[0.7,0.38],[0.3,0.62],[0.7,0.62],[0.5,0.73],[0.3,0.85],[0.7,0.85]],
};

const FACE_COLORS = {
    'J': { primary:'#2962FF', secondary:'#1A237E', accent:'#BBDEFB' },
    'Q': { primary:'#C62828', secondary:'#880E4F', accent:'#FCE4EC' },
    'K': { primary:'#E65100', secondary:'#BF360C', accent:'#FFF3E0' },
};

/* ============================================================
   Card face texture generator – high-res canvas
   ============================================================ */
function createCardFaceTexture(card) {
    const W = 512, H = 768;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    // --- white background ---
    ctx.fillStyle = '#FFFEF5';
    ctx.fillRect(0,0,W,H);

    // rounded border (stronger contrast for readability)
    ctx.strokeStyle = '#353535'; ctx.lineWidth = 8;
    roundRect(ctx,3,3,W-6,H-6,16); ctx.stroke();
    ctx.strokeStyle = '#B0B0B0'; ctx.lineWidth = 3;
    roundRect(ctx,14,14,W-28,H-28,12); ctx.stroke();

    const color = SUIT_COLORS[card.suit];
    const sym   = SUIT_SYMBOLS[card.suit];

    // --- corners ---
    ctx.fillStyle = color;
    ctx.font = 'bold 74px "Georgia","Times New Roman",serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(card.rank, 50, 55);
    ctx.font = '58px serif';
    ctx.fillText(sym, 50, 112);

    ctx.save();
    ctx.translate(W-50, H-55); ctx.rotate(Math.PI);
    ctx.fillStyle = color;
    ctx.font = 'bold 74px "Georgia","Times New Roman",serif';
    ctx.fillText(card.rank, 0, 0);
    ctx.font = '58px serif';
    ctx.fillText(sym,0,55);
    ctx.restore();

    // --- centre ---
    if (card.rank === 'A')                    drawAce(ctx,W,H,color,sym);
    else if (FACE_COLORS[card.rank])          drawFaceCard(ctx,W,H,card,color,sym);
    else if (PIP_LAYOUTS[card.rank])          drawPips(ctx,W,H,card.rank,color,sym);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
}

function drawAce(ctx,W,H,color,sym) {
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.globalAlpha = 0.18;
    roundRect(ctx,80,140,W-160,H-280,20); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = color;
    ctx.font = '240px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(sym, W/2, H/2);
    ctx.globalAlpha = 0.12;
    ctx.beginPath(); ctx.arc(W/2,H/2,150,0,Math.PI*2);
    ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.stroke();
    ctx.globalAlpha = 1;
}

function drawFaceCard(ctx,W,H,card,suitColor,sym) {
    const fc = FACE_COLORS[card.rank];
    const cx = W/2, cy = H/2;

    // frame
    ctx.strokeStyle = suitColor; ctx.lineWidth = 3;
    roundRect(ctx,75,130,W-150,H-260,12); ctx.stroke();
    const g = ctx.createLinearGradient(75,130,75,H-130);
    g.addColorStop(0, fc.accent); g.addColorStop(0.5,'#FFFEF5'); g.addColorStop(1, fc.accent);
    ctx.fillStyle = g; roundRect(ctx,76,131,W-152,H-262,11); ctx.fill();

    // head
    ctx.fillStyle = fc.primary;
    ctx.beginPath(); ctx.arc(cx,cy-80,54,0,Math.PI*2); ctx.fill();

    // headwear
    ctx.fillStyle = fc.secondary;
    if (card.rank === 'K') {
        ctx.beginPath();
        ctx.moveTo(cx-52,cy-122);
        for (let i=0;i<5;i++){
            const a = Math.PI + (i/4)*Math.PI;
            const r2 = i%2===0 ? 50 : 30;
            ctx.lineTo(cx+Math.cos(a)*52, cy-122-r2);
        }
        ctx.lineTo(cx+52,cy-122); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#FFD700';
        [[cx,cy-160],[cx-30,cy-148],[cx+30,cy-148]].forEach(([px,py])=>{
            ctx.beginPath(); ctx.arc(px,py,6,0,Math.PI*2); ctx.fill();
        });
    } else if (card.rank === 'Q') {
        ctx.beginPath();
        ctx.moveTo(cx-44,cy-128);
        ctx.quadraticCurveTo(cx-30,cy-168,cx,cy-155);
        ctx.quadraticCurveTo(cx+30,cy-168,cx+44,cy-128);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#E91E63';
        ctx.beginPath(); ctx.arc(cx,cy-150,8,0,Math.PI*2); ctx.fill();
    } else {
        ctx.beginPath();
        ctx.ellipse(cx,cy-132,50,22,0,0,Math.PI*2); ctx.fill();
        ctx.fillStyle = fc.primary;
        ctx.beginPath(); ctx.arc(cx+28,cy-150,13,0,Math.PI*2); ctx.fill();
    }

    // face
    ctx.fillStyle = '#FFE0B2';
    ctx.beginPath(); ctx.arc(cx,cy-74,40,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#333';
    ctx.beginPath(); ctx.arc(cx-14,cy-82,5,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx+14,cy-82,5,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#8D6E63'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx,cy-64,10,0.1*Math.PI,0.9*Math.PI); ctx.stroke();

    // body
    ctx.fillStyle = fc.primary;
    ctx.beginPath();
    ctx.moveTo(cx-58,cy-22);
    ctx.quadraticCurveTo(cx-72,cy+80,cx-58,cy+155);
    ctx.lineTo(cx+58,cy+155);
    ctx.quadraticCurveTo(cx+72,cy+80,cx+58,cy-22);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = fc.secondary; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx,cy-22); ctx.lineTo(cx,cy+155); ctx.stroke();

    // suit on robe
    ctx.fillStyle = suitColor; ctx.font = '38px serif'; ctx.textAlign = 'center';
    ctx.fillText(sym,cx-30,cy+45);
    ctx.fillText(sym,cx+30,cy+45);
    ctx.fillText(sym,cx,cy+105);

    // faint large rank
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = suitColor;
    ctx.font = 'bold 220px "Georgia",serif';
    ctx.fillText(card.rank, cx, cy+30);
    ctx.globalAlpha = 1;
}

function drawPips(ctx,W,H,rank,color,sym) {
    const layout = PIP_LAYOUTS[rank]; if(!layout) return;
    const sz = rank==='10' ? 46 : 52;
    ctx.fillStyle = color;
    ctx.font = `${sz}px serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const px=85, pt=130, pb=130, aw=W-px*2, ah=H-pt-pb;
    for(const [nx,ny] of layout){
        const x = px+nx*aw, y = pt+ny*ah;
        if(ny>0.55){ ctx.save(); ctx.translate(x,y); ctx.rotate(Math.PI); ctx.fillText(sym,0,0); ctx.restore(); }
        else ctx.fillText(sym,x,y);
    }
}

function roundRect(ctx,x,y,w,h,r){
    ctx.beginPath();
    ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r);
    ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
    ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r);
    ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r); ctx.closePath();
}

/* ============================================================
   Card back texture
   ============================================================ */
function createCardBackTexture() {
    const W=512, H=768;
    const canvas = document.createElement('canvas');
    canvas.width=W; canvas.height=H;
    const ctx = canvas.getContext('2d');
    const bg = ctx.createLinearGradient(0,0,W,H);
    bg.addColorStop(0,'#0D1B2A'); bg.addColorStop(0.5,'#1B2838'); bg.addColorStop(1,'#0D1B2A');
    ctx.fillStyle = bg; ctx.fillRect(0,0,W,H);

    ctx.strokeStyle='#D4AF37'; ctx.lineWidth=6;
    roundRect(ctx,6,6,W-12,H-12,14); ctx.stroke();
    ctx.lineWidth=2;
    roundRect(ctx,18,18,W-36,H-36,10); ctx.stroke();

    ctx.strokeStyle='#D4AF37'; ctx.lineWidth=1; ctx.globalAlpha=0.22;
    const s=30;
    for(let y=30;y<H-30;y+=s)for(let x=30;x<W-30;x+=s){
        ctx.beginPath();
        ctx.moveTo(x+s/2,y); ctx.lineTo(x+s,y+s/2); ctx.lineTo(x+s/2,y+s); ctx.lineTo(x,y+s/2);
        ctx.closePath(); ctx.stroke();
    }
    ctx.globalAlpha=1;

    ctx.fillStyle='#D4AF37'; ctx.globalAlpha=0.8;
    ctx.beginPath(); ctx.arc(W/2,H/2,72,0,Math.PI*2); ctx.lineWidth=3; ctx.stroke();
    ctx.beginPath(); ctx.arc(W/2,H/2,56,0,Math.PI*2); ctx.stroke();
    ctx.font='38px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('♠',W/2,H/2-22); ctx.fillText('♥',W/2+22,H/2);
    ctx.fillText('♦',W/2,H/2+22); ctx.fillText('♣',W/2-22,H/2);
    ctx.globalAlpha=1;

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
}

/* ============================================================
   Texture caching
   ============================================================ */
const textureCache = new Map();
let backTexture = null;

export function getCardBackTexture() {
    if(!backTexture) backTexture = createCardBackTexture();
    return backTexture;
}
export function getCardFaceTexture(card) {
    const k = `${card.suit}_${card.rank}`;
    if(!textureCache.has(k)) textureCache.set(k, createCardFaceTexture(card));
    return textureCache.get(k);
}

/* ============================================================
   3D Card Mesh – dual-plane construction
   Front face (+Y when flat) and back face (-Y when flat)
   ============================================================ */
export function createCardMesh(card, faceUp = false) {
    const W = 0.7, H = 1.0;
    const THICK = 0.014;
    const group = new THREE.Group();

    const faceTex = getCardFaceTexture(card);
    const backTex = getCardBackTexture();

    // Front face – visible from above when face-up
    const fGeo = new THREE.PlaneGeometry(W, H);
    const fMat = new THREE.MeshPhysicalMaterial({
        map: faceTex, roughness: 0.35, metalness: 0,
        clearcoat: 0.35, clearcoatRoughness: 0.28,
        emissive: 0xffffff, emissiveMap: faceTex, emissiveIntensity: 0.26
    });
    const fMesh = new THREE.Mesh(fGeo, fMat);
    fMesh.rotation.x = -Math.PI/2;   // lay flat, normal = +Y
    fMesh.position.y = THICK/2 + 0.002;   // protrude above edge box
    fMesh.renderOrder = 1;
    fMesh.castShadow = true;
    fMesh.receiveShadow = true;
    group.add(fMesh);

    // Back face – visible from above when face-down
    const bGeo = new THREE.PlaneGeometry(W, H);
    const bMat = new THREE.MeshPhysicalMaterial({
        map: backTex, roughness: 0.4, metalness: 0,
        clearcoat: 0.3, clearcoatRoughness: 0.3,
        emissive: 0xffffff, emissiveMap: backTex, emissiveIntensity: 0.18
    });
    const bMesh = new THREE.Mesh(bGeo, bMat);
    bMesh.rotation.x = Math.PI/2;    // normal = -Y
    bMesh.position.y = -(THICK/2 + 0.002);
    bMesh.renderOrder = 1;
    bMesh.castShadow = true;
    group.add(bMesh);

    // Edge – pushed back in depth to never occlude faces
    const eGeo = new THREE.BoxGeometry(W-0.01, THICK, H-0.01);
    const eMat = new THREE.MeshStandardMaterial({
        color: 0xF5E9CF, roughness: 0.45,
        polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2
    });
    const eMesh = new THREE.Mesh(eGeo, eMat);
    eMesh.renderOrder = 0;
    group.add(eMesh);

    group.userData.card = card;
    group.userData.faceUp = faceUp;
    group.userData.isCard = true;

    if(!faceUp) group.rotation.z = Math.PI;
    return group;
}
