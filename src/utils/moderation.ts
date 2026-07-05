const FIRST_NAMES = [
  'john', 'jane', 'bob', 'alice', 'michael', 'sarah', 'david', 'emily', 'james', 'jessica',
  'robert', 'jennifer', 'william', 'linda', 'richard', 'barbara', 'charles', 'susan', 'joseph',
  'thomas', 'karen', 'christopher', 'nancy', 'daniel', 'lisa', 'matthew', 'betty', 'anthony',
  'margaret', 'mark', 'sandra', 'donald', 'ashley', 'steven', 'kimberly', 'paul', 'donna',
  'andrew', 'carol', 'joshua', 'michelle', 'kenneth', 'amanda', 'kevin', 'melissa', 'brian',
  'deborah', 'george', 'stephanie', 'edward', 'rebecca', 'ronald', 'sharon', 'timothy', 'laura',
  'jason', 'cynthia', 'jeffrey', 'kathleen', 'ryan', 'amy', 'jacob', 'angela', 'gary', 'shirley',
  'nicholas', 'anna', 'eric', 'brenda', 'jonathan', 'pamela', 'stephen', 'emma', 'larry', 'nicole',
  'justin', 'helen', 'scott', 'kathryn', 'brandon', 'gloria', 'benjamin', 'sara', 'samuel', 'diane',
  'frank', 'julie', 'gregory', 'joyce', 'raymond', 'evelyn', 'patrick', 'judith', 'alexander',
  'megan', 'jack', 'cheryl', 'dennis', 'andrea', 'jerry', 'hannah', 'tyler', 'jacqueline', 'aaron',
  'martha', 'josé', 'madison', 'adam', 'teresa', 'henry', 'douglas', 'zachary', 'ciara', 'peter',
  'grace', 'kyle', 'amber', 'walter', 'brittany', 'harold', 'belinda', 'keith', 'patricia',
]

const LAST_NAMES = [
  'smith', 'johnson', 'williams', 'brown', 'jones', 'garcia', 'miller', 'davis', 'rodriguez',
  'martinez', 'hernandez', 'lopez', 'gonzalez', 'wilson', 'anderson', 'thomas', 'taylor', 'moore',
  'jackson', 'martin', 'lee', 'perez', 'thompson', 'white', 'harris', 'sanchez', 'clark', 'ramirez',
  'lewis', 'robinson', 'walker', 'young', 'allen', 'king', 'wright', 'scott', 'torres', 'nguyen',
  'hill', 'flores', 'green', 'adams', 'nelson', 'baker', 'hall', 'rivera', 'campbell', 'mitchell',
  'carter', 'roberts', 'gomez', 'phillips', 'evans', 'turner', 'diaz', 'parker', 'cruz', 'edwards',
  'collins', 'reyes', 'stewart', 'morris', 'morales', 'murphy', 'cook', 'rogers', 'gutierrez',
  'ortiz', 'morgan', 'cooper', 'peterson', 'bailey', 'reed', 'kelly', 'howard', 'ramos', 'kim',
  'cox', 'ward', 'richardson', 'watson', 'brooks', 'chavez', 'wood', 'james', 'bennett', 'gray',
  'mendoza', 'ruiz', 'hughes', 'price', 'alvarez', 'castillo', 'sanders', 'patel', 'myers', 'long',
  'ross', 'foster', 'jimenez',
]

const PERSONAL_NAMES = new Set([...FIRST_NAMES, ...LAST_NAMES])

const VIOLENCE_PHRASES = [
  'kill you', 'kill him', 'kill her', 'kill them', 'kill me',
  'i will kill', "i'll kill", 'gonna kill', 'going to kill',
  'shoot you', 'shoot him', 'shoot her', 'shoot up', 'shoot the',
  'stab you', 'stab him', 'stab her',
  'beat you up', 'beat him up', 'beat her up',
  'hurt you', 'hurt him', 'hurt her', 'gonna hurt', 'going to hurt', 'i will hurt', "i'll hurt",
  'burn down', 'blow up', 'bomb the', 'bombing',
  'end his life', 'end her life', 'end your life', 'end their life',
  'come after you', 'come after him', 'come after her',
  'make him pay', 'make her pay', 'make them pay',
  'gonna die', 'going to die', 'you will die', "you're gonna die",
]

/** Returns a flagged reason if the text may contain a personal name or a threat of violence, or null if clean. Initials (single letters) are intentionally allowed. */
export const checkContentModeration = (text: string): { reason: string } | null => {
  const lower = text.toLowerCase()

  for (const phrase of VIOLENCE_PHRASES) {
    if (lower.includes(phrase)) {
      return { reason: 'a possible threat of violence' }
    }
  }

  const words = lower.match(/[a-z']+/g) || []
  for (const word of words) {
    if (word.length > 1 && PERSONAL_NAMES.has(word)) {
      return { reason: 'a personal name' }
    }
  }

  return null
}
