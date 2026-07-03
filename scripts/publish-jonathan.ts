/**
 * Publishes "Jonathan" directly as PUBLISHED (owner's story, no contract needed).
 * Run: node --env-file=.env -e "require('tsx/cjs'); require('./scripts/publish-jonathan.ts')"
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const AUTHOR_ID = "cmqt9h0oq00023sg01effq07u"; // ezeodilipaul@gmail.com

// Cleaned story text (blank lines = paragraph breaks)
const STORY_TEXT = `He will come. After my mother reads the last bible verse for the day, prays in tongues like she is binding demons, clings the tattered bible to her breasts, and strides to her bedroom with pouted lips.

My mother doesn't like it when I pray in tongues. She doesn't like it when my sister, Titi, tries to do it either. She would say our tongues are too cacophonous, and we are abusing the power of the holy spirit. So, she does it herself, while we watch her and lock our giggles behind clenched lips. When she is done, she would frown and drag her feet to her room. Maybe God shows her how she will die.

After evening prayers, Titi takes me to my room.

He will come after Titi kisses my forehead with her cold quivering lips. The cold kiss offers me no comfort, but it is a nice gesture, so I smile at her. I smile to assure my big sister that I will be fine. She doesn't smile back. Perhaps, she doesn't believe I will be fine. Perhaps, she, too, knows he will come.

An ugly scar stretches on Titi's neck. She always tries to hide it from me with her hair, but the scar is glaring – like a finger-drawn line, on a layer of old mud. I always notice how she bends her head this way and that way, to keep the scar from view. Someday, I will ask her if it still hurts. But tonight, I will let her hide it.

'Just close your eyes and try to sleep, and everything will be fine, okay?' Titi says, caressing my shoulders. Her touch is cold, too.

I nod.

Titi flicks my light off and walks away.

Ten years ago, we shared the room together, on the same bed. I was the small, fragile girl and Titi was the bright daughter who made our mother proud. I didn't like that about Titi. It irked me, but I never showed anyone. Every night, our mother smiled at Titi and caressed her plump cheeks, then scowled at me like I was a leper. I wanted it to end. One day, it did end. I can't recall why, but something happened and Titi had to leave the room, leaving me to sleep by myself.

'It is better this way,' my mother said one evening, as she gripped a pestle and pounded tomato in a mortar, grimacing like she was pounding all her enemies. 'You have to grow up so that that demon will leave you alone.' Some tomato bits stained her gown, a few inches above her waist. It was red and dry and did not seem like it would go easily after washing. And the red stain slept on her gown like it belonged there.

My mother thinks sleeping alone will keep him away, but I know he will come. After I spend a few hours staring at my ceiling fan, watching the silver blades slice darkness; after I cling on to my bedsheet as goosebumps creep in and coat my skin. He will come after bolts of lightning flash in my room and thunder roars like the sky is ripping apart.

The noise terrifies me, prompting me to kick a table. My bottle of pills rattles, falls off the table, and rolls under my bed.

A storm is coming, but I hope he comes first. I do not want to be alone when the storm comes, and I wish Titi stayed with me. I want a friend, a companion, someone to lay on my bed and watch me sleep.

When he finally comes, he does not walk through my door or creep in through my window like the rats did. He just... comes, and he stands by my bedside, smiling subtly. The room is covered in darkness, but I see him clear as day.

I stare at him with fearful delight. 'Jonathan,' I say.

Jonathan is beautiful, and his skin seems to radiate a bronze glow. He is angelic. When he smiles, his eyes smile as well. He sits by my side, his dark eyes fixed on me. 'It wasn't easy getting here. The storm almost kept me away, but I had to see you,' he says.

He kisses my forehead, and I feel the warmth of his full lips on my skin.

'Trouble sleeping?' he asks.

'I always have trouble sleeping.' I shift to one side of the bed. 'Do you want to lay beside me?'

'I'd like that.'

He lays beside me, and his skin touches my own. I feel it, real as my bed.

'Can you stay, until I fall asleep?' I ask him.

'Sure. But you know, we can stay awake for a while longer. I just got here, and the night is still young.'

'Oh… My mom says I have to sleep right away. And my sister. And my doctor.'

Jonathan scoffs. 'Sleep is just a boring way to end the day, and there's so much fun that we can do.'

'Like what?'

'I brought a gift for you, and we can play with it together. But first, tell me about your day.'

'My day… Uhm, I told my elder sister about you today. That you are my friend. She laughed and said you aren't real. She said I am seeing things, and you are only in my head.'

Jonathan laughs. 'But that is ridiculous.'

'I know, right? That's why I insisted. I told her you are real. That you will come, and I will touch your hand. She didn't smile anymore. She stared at me horridly, then she ran to my mother and told her I was keeping imaginary friends again.'

'You used to keep imaginary friends before?'

I nod. 'My mother was worried. She grabbed my arms and looked at me closely. Her eyes were bloodshot and almost teary. She yelled into my face, urging me to denounce you, that I must stop thinking about you.'

'Why was she so scared?'

'Bad things happen when I keep imaginary friends.'

Jonathan touches my cheek to comfort me. His warm fingers trace a line along my face to my chin, and I hold my breath every step of the way. 'What did your mother do when she learnt about me?'

'Oh... She…' I clear my throat. 'She dragged me to the pastor, Pastor Ejiro, to pray for me. He and my mother prayed for hours, shaking like they were been electrocuted. The pastor gripped the bible and began jumping and twirling. I tried my hardest not to laugh. I knew that if I laughed, they would only keep praying harder, and he would smack my head with the Bible.

'The pastor did that the first time he prayed for me – when I was six. My mother took me to him. They said there was a demon inside me, and I was seeing evil spirits. The pastor smacked me so hard, I fell to the floor, holding my head in pain. I wanted my mother to help me up, but she stood there rejoicing. Something about my agony made them think I would stop seeing my friend – the one they called an evil spirit, just because they couldn't see him.'

Jonathan snatches his fingers off my face, frowning, looking like he might cry. 'And did you stop seeing him?'

I look away for a moment. My gaze shifts to my ceiling fan, spinning in the dark of my room. The silver blades spin terribly fast, hurling packets of air at me. It reminds me of the first time I pressed a silver knife on my thigh in the middle of the night and pushed it down my brown skin, so that blood seeped out and crawled down my leg, pushing past the strands of hair on my calf and leaving, behind it, a trail of red. That was ten years ago. But I did something else to my sister and mother. Something darker. Something that made me begin sleeping all alone, every night. I sigh.

'I had to stop seeing him eventually.'

'Oh, okay,' Jonathan says. 'Do you believe the prayer worked? Is that why you stopped seeing him, because the prayer worked?'

I shrug. 'I don't know. But, today, I knew they wouldn't stop praying until I shake and tumble to the ground, as if some mystical force overwhelmed me. So, I fell. My mother smiled joyously when I did. She smiled, while waving her arms over her head. The pastor kept chanting, "we thank you, Lord". Later, my mother gave the pastor some money and thanked him earnestly.

'After that, we went to the doctor to—'

'Wait,' Jonathan cut in, 'if she was going to take you to the doctor, then why the pastor?'

'My mother is very religious. She believes God must come first, before any other thing. My mother says there's a demon in my head that controls—'

The door to my room flings open, and the light is turned on. My mother stands in my room now, her arms are folded across her bosom. Her eyebrows sprawl furiously above angry eyes. She is clad in a large gown that touches the ground. It is the same gown with the tomato stain. I don't understand why she keeps wearing the same gown.

'I have been listening,' my mother claims. 'Who are you talking to, Funmi? Who?'

'Mummy,' I cry, springing up from my bed. 'The light! I don't want the light on.'

'Shut up,' my mother snaps. 'Who were you talking to?'

I point at Jonathan. He waves at us with a single stroke of his hand.

'He is laying there, on my bed,' I tell my mother, but she says:

'Funmi, I can't see anybody.' Her face falls, and she squeezes her face like she will break down and cry. 'Funmi, I can't see... I can't see anybody.'

'But he is there. He is greeting you.'

'Titi o!' My mother screams in terror. She pokes her head out the door. 'Titi!'

Titi rushes into my room. She is nineteen, only three years older than me but bigger in every way. Titi's hair was bundled up, but the moment she steps into my room, she lets her hair loose, so that it falls and covers the scar on her neck. I always notice.

'Funmi, show your friend to your sister,' my mother says.

My fingers intertwine lazily. I can barely feel my legs now, as my knees turn to water. I do not understand why they can't see him – why only I can see him. If he is not real, how then can I touch him and smell his breath. I turn to him. He sits on the bed, sad. Poor Jonathan. I turn to Titi – the closest person to me in the world.

'Titi, he is there. I swear.' Tears sting my eyes. I want my sister to see Jonathan.

A couple of tear drops slip off Titi's weary eyes. She sniffs. 'Funmi, there is no one there. You are seeing things again. Remember what happened the last time? Please don't hurt me again.' Titi caresses my shoulder, and the memories from ten years ago flood my heart.

I look at her scar. And I remember now, vaguely. I remember what happened that night: After I cut myself in the room I shared with Titi, I attacked her with the knife while she slumbered. It was messy. There was blood. Everywhere – on the wall, on my lips, on the bed... Sigh. I hang my head.

'I didn't mean to hurt you,' I tell my sister, crippled with guilt and shame. 'It was my friend. He told me to… I'm sorry.'

Titi throws her arms around me. 'It's okay. It's fine now. I know you're sorry. That's why you must stop seeing this new friend.'

'Did you take your sleeping pills?' my mother asks. Titi releases me and I shake my head.

'Where are they? The doctor said you must take them before you sleep. Didn't you hear?' her mother said, her hands akimbo. 'Take your pills now. Tomorrow, we will see Pastor Ejiro again.'

'I don't want them. I hate the sleeping pills,' I grumble.

'Funmilayo!' My mother's voice thunders. 'I'm tired of your nonsense. Take your pills before I descend on you this night.'

'B—but—'

'Take the pills,' Jonathan speaks.

I glance at him. He is sitting there, on my bed, glaring at my family. I did not know he is capable of glaring.

'Okay,' I concede. 'I'll take them.'

'Now,' my mother orders. 'I want to see you swallow them.'

'Don't swallow them,' Jonathan says. I turn to him again, afraid and perplexed. My fingers tremble. Jonathan continues, his jaw clenched: 'They want me gone. If you swallow it, I'll be gone. And I don't want to go. I want to be your friend and I never want to leave you. So, don't swallow it. Hide it somewhere in your mouth, so you can spit it out later.'

I nod slowly, like my neck is broken. I search for the pills underneath my bed. When I find it, I throw two pills into my mouth. With a leftover sachet of water, I pretend to gulp the pills down. When my mother is satisfied, she leaves.

Titi's finger rests on the light switch. 'Please try to sleep,' she says with a gleam in her eyes, then she turns the light off, walks out of the room, and shuts the door behind her.

I spit the pills into my hand and throw them under my bed. When I lay on my bed again, supine, Jonathan joins me.

Images flash in my mind, and each image strikes my heart, like lightning. Red images. Blood red. Warm, like Jonathan's touch. Squirting. Dripping. Staining. A silver blade swinging, reflecting moonlight. The shock on my sister's face. The look in her eyes. Her widened eyes. Frightened. Titi's screams pierce my head. It is loud and raging, like thunder.

I turn to Jonathan and our eyes lock together, unblinking. Panic is swelling in my chest as Titi's screams wane in my head – as though she screams from far away. I stare into the depth of Jonathan's eyes, searching for comfort in them. I do not find it.

'Are you real?' I ask.

Jonathan takes my hand and holds it. His hands feel warm like my mother's embrace. 'If you can't tell, does it matter?'

'No,' I say. 'No, it doesn't… It doesn't.'

I think I am hyperventilating now. Is this what it feels like? My chest keeps rising and falling, like balloon pumping air. I hurt Titi all those years ago. I did not intend to do it. But he had made me. My friend. My old friend. The friend I had – the friend I had to stop seeing. The friend from ten years ago. His name. He said his name was...

'Jonathan,' I cry and turn to the boy laying beside me. 'You're the same friend I had ten years ago. The same friend who made me—'

'Yes,' Jonathan says with glazed eyes. 'They are bad people. Your sister and your mother. They are both bad people. They don't want you to have a friend. They tried to push me away before, but I've come back to help you. Because you need me.'

'No,' I say, my voice weak like a whisper. 'I don't need you.'

'Yes, you need me. Your life is miserable. Completely miserable. Your mother hates you; she can barely look at you. I'm sure she thinks you're just wasting oxygen. You're nothing to her. And she wishes you would just die. And your sister? She's the worst. See how she looks at you. She thinks she's better than you. And now that you have me, a friend, they are trying to get rid of me. You have to kill them, to be free.'

'No!' I snap, my face wet with tears. Catarrh crawls out of my nose. I sit up. 'I don't want to do that. I'd rather kill myself,' I say with gritted teeth. I draw back snot, thinning my scrawny neck.

Jonathan sits up as well, smirking. 'I told you I brought a gift for you.' He pulls a dagger out of nowhere and passes it to me. 'If you'd rather kill yourself, then you should do it. Kill yourself.'

'No,' I say. My voice is shaky. Unsure. My heart is beating too hard. It aches me. 'I don't want to die.'

'Of course, you do.' Jonathan smiles charmingly. 'That's why I'm here.'

'I don't want you here!' I yell, shooting my head forward.

Jonathan touches my lap. 'Yes, you do. Again, that's why I'm here. Because you need me. I'm only a projection of your subconscious mind, and you know it. You are a smart girl. I'm here, because somewhere in your fucking skull, you want me to be here. You want to die. Take the blade.'

I raise my hand, slowly. My fingers tremble. I touch the dagger. It is razor sharp.

Jonathan grits his teeth. 'Take it!' he yells.

I flinch then hold the dagger and take it from him.

'Good,' Jonathan says. 'Now, place it by your neck,' he touches his jugular, 'Right there.'

I wipe my tears with the back of my hand. Then I obey him. The blade touches my skin. It is cold, like death, like my sister's kiss, and it soothes me. I like it, the blade on my skin. I like that I am so close to death. Jonathan is right. Death is all I want. All I need to do is push the blade or drag it against my flesh, until I feel my blood warm my skin. I have done it before, and it felt good. Euphoric. I can do it again. I just need to cut deeper for a lasting effect. I just need to—

The door flings open. It is my mother, again. She flicks the light on, and the light blinds me momentarily. My mother seems angrier than the first time. She bites her lower lip, too hard. Her brows pull closer and her forehead wrinkles. Her glare pierces me, but I hold unto the dagger tighter while the blade rests on my neck. Soon, my mother bursts out laughing, but I do not think she is amused. The laughter ceases abruptly.

'So, you and that demon – that evil spirit – you're talking to, thought I would just go away?'

Titi trails behind our mother, her face full of sadness. 'Funmi, why?'

Her sad eyes move my heart. What am I doing? My lips quiver. I am hurting my sister, again. Everything I do hurts my sister. I am tired of it. I just want everything to end. My fingers tremble, again. The blade dances on my skin.

'Do it now!' Jonathan snaps, glaring at Titi.

I swallow saliva. I can do it. My family will be better without me. They will mourn me for a while, but they will move on. They have to move on. I clench my jaw and tighten my grip on the dagger handle.

My mother steps forward. 'Funmi, put the knife down. Give it to me; give me the knife.' She stretches her arm. Titi hides behind our mother.

'Don't let them stop you. You have to do it now,' Jonathan says.

'I love you, Funmi. Please give me the knife,' my mother pleads.

Jonathan laughs, shaking his head. He jumps out of the bed. 'She is lying,' he says.

I sniff. My grip on the dagger weakens and its blade sits on my shoulder. I turn to Jonathan. 'She is my mother. How can she lie about that? About loving me.'

Jonathan smiles smugly. 'She's lying, because she is not real. Both of them; they are not real,' he says.

'W—What?' I ask, confounded by his words. I turn to my family. They stare back at me, almost frozen. My mother's hand hangs in the air, and her eyes do not blink. Titi cowers behind our mother, still, unmoving.

Jonathan points at my family with a firm finger. 'Look at them! Look at your sister. The scar on her neck. Don't you remember what you did to her?'

'What I did?' I touch my chest. My memories return, taking me back to that night I raised a knife against Titi. I gasp. 'I cut her.'

'Where?' Jonathan asks.

'On her neck,' I cry, my gaze lingers on Titi. Neither of them are moving, my family. I do not understand why they stand frozen – why my mother is not snatching the dagger from my hand, as she tried to do ten years ago. 'I cut my sister's neck.'

'And what happened next?'

I lower my head, staring at my mother's gown, where the red stain is. The tomato stain? But it is red. Too red. It is blood red. It is blood. My head aches. I lower the dagger and hold the handle with both hands. 'I don't remember.'

Jonathan chuckles. 'I remember. I'm a projection of your subconscious mind. If I remember, then it's somewhere in your head. Suppressed. Beneath all the bad dreams and all your shitty, sick desires. Don't worry, I'll help you remember too. Ten years ago, you snuck a knife into your room. And—'

'You told me to do it!' I yell at him, my voice thins and strains, with veins stiffening in my neck.

'Take responsibility for your actions,' Jonathan yells back. He is not smiling anymore. 'Ten years ago, you snuck a knife into the bed you shared with your sister. She laid beside you. You cut your thighs and liked the feeling of warm blood on your skin. You wanted more. Your sister turned. You feared she was going to take the knife from you, so you decided to cut her neck while—'

I wail, overwhelmed with guilt and bitter emotions. My heart is throbbing and swelling. Catarrh crawls down my nose and dwells on my upper lip. I can taste it, and I do not wipe it off. I do not care. 'I did not decide anything. You told me to—'

'You cut your sister's neck. Look at her!' He walks up to Titi, where she stands frozen, and holds her hair up. 'Look at her scar. You did this. See how ugly it is, embedded on the side. Look how deep you cut. Do you think she survived that?'

I look up, mouth agape. My memory is blurry, but I remember there were lots of blood squirting from my sister's neck that night. 'I—I... I must have called for my mother, to help.'

Jonathan's uptight face falls. He smiles again. 'But you didn't. There was too much blood. Titi bled out on the bed and died. You murdered your sister. And your mother? Look at her gown – at the stain. You really think that is tomato? You can't be that retarded.'

Air rushes in and out of my face. I can feel my lungs struggling inside me. More memories come back. I screamed that night, after cutting Titi. Titi screamed too. The screams pierce my head again. They sting me, like a brief migraine. I screamed too loudly that night. Our mother rushed to our room, holding her mouth and screaming in shock. Titi laid still on the bed, dead, and the entire bed was soaked with her blood. My mother tried to take the knife from me.

Jonathan jumped on the bed dramatically. He leaned forward. 'And what did you do to your mother?'

More images flash across my eyes. A silver blade was swung. My mother raised her hands in fright. I gasp.

Jonathan touches my shoulder. 'What happened?'

My gaze stays on my mother. 'I stabbed her stomach. That isn't tomato. It's blood,' I confess it, like I'm in a trance.

Jonathan smiles, as though proud of me. 'You killed her too,' he whispers in my ears.

'I don't understand,' I say. The dagger slips from my grip and drops on the bed. 'If they're dead, why are they still here? Everything that happened today, with Pastor Ejiro and... everything. How did that happen, if they are dead?'

Jonathan picks the knife up. 'Did it really happen? Did it actually happen, or did you just imagine it and narrate the story to me?'

'I don't know,' I say. 'I don't understand.'

'It's okay, it's fine. I'm here to help you. Your brain… It's capable of creating anything and creating everything – including them, fragments of your past.'

'They are not real,' I say, reality dawning on me. My frozen family disappears, like a candle flame against wind. 'Where did they go?'

'It doesn't matter,' Jonathan says. He puts the dagger back in my hand and tightens my fingers around it. 'You killed them. You are a killer: a terrible, terrible person. You deserve to die. Now, drive the knife into your body and end all this.'

'Nooo,' I cry. 'Please, stop, I don't want to die.'

Jonathan holds my hand, softly. 'Yes, you do. You have to. You don't deserve to keep living. Die, Funmi, just die. End everything.'

'No!' I scream.

Jonathan scowls, irritated. 'What's the purpose of your living? Can't you see that you are nothing? Can't you see?'

That word strikes me. See. What can I see? I stare around my room. My door, still open; my curtain, dancing with the wind; my fan, ever spinning. Everything is normal in the room – just as they were ten years ago.

I turn to Jonathan, and he stares at me suspiciously. 'If my mom and sister died ten years ago, then how am I still here, in this room?' I ask him.

Jonathan's lips part. His eyes widen. There is a look on his face I have never seen before. Fear. 'Stop thinking about this nonsense. Just kill yourself.'

'No,' I tell him. 'I shouldn't be here, in this same room, after all these years. I should be somewhere else. This can't be real. That fan, that window—' She held the knife up and chuckled dryly— 'This knife. None of it is real. Including you.'

Jonathan glares at her. 'Just stop!'

'Why? You know. You know that once reality dawns on me, all these façades will disappear. Like my mother and sister did.'

Jonathan stares around, frightened. His grip on her fingers tightens. He turns to the fan and the blades stop spinning. He turns to the curtain, and it stops dancing. 'No,' he breathes. 'Not again.'

I know what I must do now. I close my eyes, so tight, the lashes fold inside. I have to think of nothing. Not of my family or the agony it brings my heart, not of Jonathan, and not of all the blood I spilled.

I think of reality.

'Open your eyes!' Jonathan yells the words. 'Stay with me. Open your fucking eyes! Open your eyes, you stupid, fucking, stupid— Please open your eyes!'

I block him out of my mind. My eyes stay shut. He keeps yelling the words over and over and over again, until his voice begins to wane and silence; until the only sound I hear is my steady breath and my beating heart. And then I hear a new voice.

'Funmi, open your eyes.'

The voice is high-pitched, feminine, gentle, and calming. Someone touches my face, cupping my cheek. 'Open your eyes,' she says again.

My eyelids part, and I see a bright light, almost blinding. I flinch and shut my eyes. The hand on my face caresses my cheek. I open my eyes again. The light is gentler this time. A woman stares down at me, smiling. She is old and wrinkled all over her face.

I try to stand, but I can't move. I am strapped to a narrow bed. It is soft, the bed, like cotton on my back. My eyes search around. I am in a different room, with walls painted white.

'Who are you?' I ask the woman, weakly.

'I'm your nurse.'

'My sister and mom?'

'You don't remember? They died, ten years ago.'

'I killed them,' I say, more to myself than to her.

The nurse nods gently. 'You mustn't blame yourself. It was a long time ago. You were sick, but you are getting better.'

'But I killed them,' I scream, and I keep screaming. 'I killed them. I killed them. I killed them.' Soon, tears stream down my eyes and I am gasping for air. I try to move my arms and kick my legs, but they are stuck fast to the bed. I pull harder at the straps, trying my hardest to break free.

The nurse rushes to a table and returns with an injection.

'What is that?' I ask, panicky.

'I'm going to give you another sedative,' the nurse says, preparing the needle. 'It will help you sleep.'

Another sedative?

'No! Please,' I cry. I know what will happen to me if I lose consciousness again. 'You can't give me that. I don't want to sleep. Please, I have to stay awake. Don't stick that needle in me!'

'Relax, it will help you,' says the nurse, rubbing my arm.

'No, no… He will come,' I try to tell her, but she doesn't listen. I'm screaming now. Frantic. 'If I sleep, he will come again, please.'

She pierces the needle into my skin and injects the sedative.

It works like magic. The nurse stands, retreating, and her image soon becomes blurry. The table becomes blurry too. My eyelids grow heavy, and I can hardly keep my eyes open. The white walls fade like watercolours. And as everything blurs, only one thing remains clear – only one person. Jonathan.

He stands by my bedside, smiling wolfishly. He glows like the moon, and his eyes hold an almost loving, but more haunting look. Troubling.

'No,' I breathe. My eyes close and I drift off to sleep.

'Sleep well,' Jonathan says. 'Now, let's try again.'`;

// Tags for "Jonathan" — psychological horror, literary Nigerian fiction, dark themes
const TAGS_TO_UPSERT = [
  { slug: "horror", label: "Horror" },
  { slug: "psychological", label: "Psychological" },
  { slug: "nigerian-fiction", label: "Nigerian Fiction" },
  { slug: "literary-fiction", label: "Literary Fiction" },
  { slug: "dark-themes", label: "Dark Themes" },
  { slug: "mental-health", label: "Mental Health" },
];

function generateId(prefix: string): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = prefix;
  for (let i = 0; i < 24; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

function plainTextToDoc(text: string) {
  const paragraphs = text
    .trim()
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  return {
    type: "doc",
    content: paragraphs.map((t) => ({
      type: "paragraph",
      attrs: { id: generateId("p") },
      content: [{ type: "text", text: t }],
    })),
  };
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).length;
}

async function main() {
  console.log("Publishing Jonathan...");

  // Verify author exists
  const author = await prisma.user.findUnique({
    where: { id: AUTHOR_ID },
    select: { id: true, name: true, email: true },
  });
  if (!author) throw new Error(`Author not found: ${AUTHOR_ID}`);
  console.log(`Author: ${author.name} <${author.email}>`);

  // Upsert tags
  const tagIds: string[] = [];
  for (const tag of TAGS_TO_UPSERT) {
    const record = await prisma.tag.upsert({
      where: { slug: tag.slug },
      update: {},
      create: { slug: tag.slug, label: tag.label },
    });
    tagIds.push(record.id);
    console.log(`Tag: ${tag.slug} (${record.id})`);
  }

  const bodyDoc = plainTextToDoc(STORY_TEXT);
  const wordCount = countWords(STORY_TEXT);
  const now = new Date();

  const story = await prisma.story.create({
    data: {
      authorId: AUTHOR_ID,
      title: "Jonathan",
      hookLine: "Jonathan visits when the lights go out. He is warm, beautiful, and only Funmi can see him.",
      body: bodyDoc as any,
      wordCount,
      genre: "Psychological Horror",
      coverColor: "#12080F",
      tier: "STANDARD",
      cowrieCost: 3,
      readingTime: 20,
      status: "PUBLISHED" as any,
      isDraft: false,
      publishedAt: now,
      completionRate: 0,
      tags: {
        create: tagIds.map((tagId) => ({ tagId })),
      },
    },
    select: { id: true, title: true, status: true, wordCount: true },
  });

  console.log(`\nStory created:`);
  console.log(`  ID: ${story.id}`);
  console.log(`  Title: ${story.title}`);
  console.log(`  Status: ${story.status}`);
  console.log(`  Words: ${story.wordCount}`);
  console.log(`\nNext: upload cover image to R2 for story ID ${story.id}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
