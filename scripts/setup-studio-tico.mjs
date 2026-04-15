import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore/lite';

const firebaseConfig = {
  apiKey: "AIzaSyDOeYP0MbVXKWjWhzcHJ7O0voHgk3spnNI",
  projectId: "hutex-2026",
};

const APP_ID = 'hutex-saas';
const SLUG   = 'studio-tico';
const PHONE  = '5517991788652';
const EVOLUTION_INSTANCE_NAME = 'studio-tico';

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

const p = (col, ...segs) =>
  doc(db, 'artifacts', APP_ID, 'public', 'data', col, ...segs);

async function main() {
  console.log('=== Verificando Firestore ===\n');

  // 1. Resolve lojaId from slug
  const slugDoc = await getDoc(p('slugs', SLUG));
  if (!slugDoc.exists()) {
    console.error(`❌ Slug "${SLUG}" não encontrado em slugs/`);
    process.exit(1);
  }
  const lojaId = slugDoc.data().uid;
  console.log(`✅ Slug "${SLUG}" → lojaId: ${lojaId}`);

  // 2. Check profile
  const profileDoc = await getDoc(p('profiles', lojaId));
  if (!profileDoc.exists()) {
    console.error('❌ Profile não encontrado');
    process.exit(1);
  }
  const profile = profileDoc.data();
  console.log(`✅ Profile encontrado: ${profile.nome || '(sem nome)'}`);
  console.log(`   whatsappNumber: ${profile.whatsappNumber || '(vazio)'}`);
  console.log(`   evolutionInstanceName: ${profile.evolutionInstanceName || '(vazio)'}`);

  // 3. Check whatsappNumbers mapping
  const whatsDoc = await getDoc(p('whatsappNumbers', PHONE));
  if (whatsDoc.exists()) {
    console.log(`✅ whatsappNumbers/${PHONE} → lojaId: ${whatsDoc.data().lojaId}`);
  } else {
    console.log(`⚠️  whatsappNumbers/${PHONE} não existe — criando...`);
    await setDoc(p('whatsappNumbers', PHONE), { lojaId });
    console.log(`✅ whatsappNumbers/${PHONE} criado → lojaId: ${lojaId}`);
  }

  // 4. Set evolutionInstanceName if missing
  const updates = {};
  if (!profile.evolutionInstanceName) {
    updates.evolutionInstanceName = EVOLUTION_INSTANCE_NAME;
    console.log(`⚠️  evolutionInstanceName ausente — definindo como "${EVOLUTION_INSTANCE_NAME}"...`);
  }
  if (!profile.whatsappNumber || profile.whatsappNumber !== PHONE) {
    updates.whatsappNumber = PHONE;
    console.log(`⚠️  whatsappNumber ausente ou diferente — definindo como "${PHONE}"...`);
  }

  if (Object.keys(updates).length > 0) {
    await setDoc(p('profiles', lojaId), updates, { merge: true });
    console.log(`✅ Profile atualizado:`, updates);
  } else {
    console.log('✅ Profile já está completo, nenhuma atualização necessária.');
  }

  console.log('\n=== Pronto ===');
}

main().catch(e => { console.error('Erro:', e.message); process.exit(1); });
