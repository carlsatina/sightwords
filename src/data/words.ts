import type { Level, LevelId, SightWord } from '@/types'

/**
 * Word lists follow the Dolch sight word groupings, which are ordered by how
 * early a child typically meets each word rather than by spelling difficulty.
 * Every word carries a sentence so a child can hear it in context — reading a
 * word in isolation is the test, reading it in a sentence is the lesson.
 */
type RawWord = readonly [text: string, sentence: string]

const LEVEL_WORDS: Record<LevelId, readonly RawWord[]> = {
  1: [
    ['a', 'I see a cat.'],
    ['and', 'You and me.'],
    ['away', 'The bird flew away.'],
    ['big', 'That is a big dog.'],
    ['blue', 'The sky is blue.'],
    ['can', 'I can run fast.'],
    ['come', 'Come and play with me.'],
    ['down', 'The ball rolled down.'],
    ['find', 'Can you find my shoe?'],
    ['for', 'This gift is for you.'],
    ['go', 'Let us go outside.'],
    ['help', 'I can help you.'],
    ['here', 'Come over here.'],
    ['I', 'I like to sing.'],
    ['in', 'The cat is in the box.'],
    ['is', 'My dog is happy.'],
    ['it', 'I like it a lot.'],
    ['jump', 'I can jump high.'],
    ['little', 'A little mouse ran by.'],
    ['look', 'Look at the moon.'],
    ['make', 'Let us make a cake.'],
    ['me', 'Give the ball to me.'],
    ['my', 'This is my book.'],
    ['not', 'I am not sleepy.'],
    ['one', 'I have one apple.'],
    ['play', 'We play in the park.'],
    ['red', 'The apple is red.'],
    ['run', 'I run to the door.'],
    ['see', 'I see a bird.'],
    ['the', 'The sun is warm.'],
    ['to', 'We walk to school.'],
    ['up', 'The balloon went up.'],
    ['we', 'We are best friends.'],
    ['you', 'You are so kind.'],
  ],
  2: [
    ['all', 'We ate all the grapes.'],
    ['am', 'I am six years old.'],
    ['are', 'You are my friend.'],
    ['at', 'We are at the park.'],
    ['ate', 'I ate my lunch.'],
    ['be', 'I will be there soon.'],
    ['but', 'I am small but strong.'],
    ['came', 'My friend came over.'],
    ['did', 'I did my best.'],
    ['do', 'What do you want?'],
    ['eat', 'We eat dinner at six.'],
    ['get', 'I will get my coat.'],
    ['good', 'You did a good job.'],
    ['have', 'I have two cats.'],
    ['he', 'He is my brother.'],
    ['into', 'The frog hopped into the pond.'],
    ['like', 'I like warm bread.'],
    ['new', 'I have new shoes.'],
    ['no', 'There is no milk left.'],
    ['now', 'It is time to go now.'],
    ['on', 'The book is on the table.'],
    ['out', 'The cat ran out the door.'],
    ['please', 'Please pass the water.'],
    ['said', 'She said hello.'],
    ['saw', 'I saw a rainbow.'],
    ['she', 'She likes to draw.'],
    ['so', 'I am so happy.'],
    ['that', 'That is my hat.'],
    ['there', 'Your bag is over there.'],
    ['they', 'They are playing outside.'],
    ['this', 'This is my house.'],
    ['want', 'I want to read.'],
    ['was', 'It was a sunny day.'],
    ['went', 'We went to the store.'],
    ['what', 'What is your name?'],
    ['with', 'Come with me.'],
    ['yes', 'Yes, I would like some.'],
  ],
  3: [
    ['after', 'We play after lunch.'],
    ['again', 'Let us try again.'],
    ['an', 'I ate an orange.'],
    ['any', 'Do you have any pets?'],
    ['as', 'She is as tall as me.'],
    ['ask', 'You can ask for help.'],
    ['by', 'The shop is by the park.'],
    ['could', 'I could hear the rain.'],
    ['every', 'I brush my teeth every day.'],
    ['from', 'This letter is from Grandma.'],
    ['give', 'I will give you a hug.'],
    ['had', 'We had a picnic.'],
    ['has', 'She has a red bike.'],
    ['her', 'This is her coat.'],
    ['him', 'I gave him the ball.'],
    ['his', 'That is his lunchbox.'],
    ['how', 'How does it work?'],
    ['just', 'I just finished my book.'],
    ['know', 'I know the answer.'],
    ['let', 'Let me try that.'],
    ['live', 'We live near the sea.'],
    ['of', 'A cup of milk.'],
    ['old', 'That is an old tree.'],
    ['once', 'I saw a deer once.'],
    ['open', 'Please open the window.'],
    ['over', 'The bird flew over the house.'],
    ['put', 'Put your shoes away.'],
    ['some', 'I would like some water.'],
    ['stop', 'The cars stop at the light.'],
    ['take', 'Take my hand.'],
    ['them', 'I will call them later.'],
    ['then', 'We ate, then we played.'],
    ['think', 'I think it will rain.'],
    ['walk', 'We walk to the bus.'],
    ['were', 'They were very kind.'],
    ['when', 'When is your birthday?'],
  ],
  4: [
    ['always', 'I always wash my hands.'],
    ['around', 'We walked around the lake.'],
    ['because', 'I smiled because I was happy.'],
    ['been', 'I have been to the zoo.'],
    ['before', 'Brush your teeth before bed.'],
    ['best', 'She is my best friend.'],
    ['both', 'Both cats are asleep.'],
    ['call', 'I will call you tonight.'],
    ['does', 'Does this belong to you?'],
    ['first', 'I was first in line.'],
    ['found', 'I found my missing sock.'],
    ['gave', 'He gave me a book.'],
    ['goes', 'The bus goes downtown.'],
    ['green', 'The grass is green.'],
    ['its', 'The dog wagged its tail.'],
    ['made', 'We made a sandcastle.'],
    ['many', 'There are many stars.'],
    ['off', 'Please turn off the light.'],
    ['or', 'Do you want milk or juice?'],
    ['read', 'I read a whole chapter.'],
    ['right', 'Turn right at the corner.'],
    ['sing', 'We sing in the car.'],
    ['sleep', 'I sleep with my bear.'],
    ['tell', 'Tell me a story.'],
    ['their', 'They rode their bikes.'],
    ['these', 'These apples are sweet.'],
    ['those', 'Those clouds are dark.'],
    ['us', 'Come sit with us.'],
    ['use', 'I use a blue pencil.'],
    ['very', 'The soup is very hot.'],
    ['which', 'Which one do you want?'],
    ['why', 'Why is the sky blue?'],
    ['work', 'We work as a team.'],
    ['would', 'I would like to help.'],
    ['write', 'I write my name.'],
    ['your', 'Is this your jacket?'],
  ],
  5: [
    ['about', 'This book is about whales.'],
    ['better', 'I feel better today.'],
    ['bring', 'Please bring your coat.'],
    ['carry', 'I can carry the bag.'],
    ['clean', 'We clean up after dinner.'],
    ['done', 'My homework is done.'],
    ['draw', 'I like to draw horses.'],
    ['drink', 'I drink water when I am thirsty.'],
    ['eight', 'There are eight ducks.'],
    ['fall', 'The leaves fall in autumn.'],
    ['full', 'My cup is full.'],
    ['grow', 'Sunflowers grow very tall.'],
    ['hold', 'Hold on to the rail.'],
    ['hurt', 'I hurt my knee.'],
    ['if', 'We will swim if it is warm.'],
    ['keep', 'You can keep the drawing.'],
    ['kind', 'She is kind to everyone.'],
    ['laugh', 'That story makes me laugh.'],
    ['light', 'The room is full of light.'],
    ['long', 'That is a long river.'],
    ['much', 'How much does it cost?'],
    ['myself', 'I tied my shoes myself.'],
    ['never', 'I never miss breakfast.'],
    ['only', 'I have only one left.'],
    ['own', 'I have my own room.'],
    ['pick', 'We pick apples in the fall.'],
    ['seven', 'There are seven days in a week.'],
    ['show', 'Show me your painting.'],
    ['small', 'The kitten is very small.'],
    ['start', 'We start school in September.'],
    ['together', 'We read together every night.'],
    ['try', 'I will try my best.'],
    ['warm', 'The blanket is warm.'],
    ['today', 'Today is my birthday.'],
  ],
}

const LEVEL_META: Record<
  LevelId,
  Pick<Level, 'name' | 'blurb' | 'ageRange' | 'accent'>
> = {
  1: {
    name: 'First Words',
    blurb: 'The very first words a new reader meets.',
    ageRange: 'Ages 3–4',
    accent: 'mint',
  },
  2: {
    name: 'Growing Reader',
    blurb: 'Short words that hold a sentence together.',
    ageRange: 'Ages 4–5',
    accent: 'marigold',
  },
  3: {
    name: 'Story Time',
    blurb: 'Words that show up in every storybook.',
    ageRange: 'Ages 5–6',
    accent: 'coral',
  },
  4: {
    name: 'Confident Reader',
    blurb: 'Longer words that connect ideas.',
    ageRange: 'Ages 6–7',
    accent: 'grape',
  },
  5: {
    name: 'Word Explorer',
    blurb: 'Tricky words for a reader who is ready.',
    ageRange: 'Ages 7–8',
    accent: 'ink',
  },
}

function buildLevel(id: LevelId): Level {
  const words: SightWord[] = LEVEL_WORDS[id].map(([text, sentence]) => ({
    id: text.toLowerCase(),
    text,
    levelId: id,
    sentence,
  }))
  return { id, ...LEVEL_META[id], words }
}

export const LEVELS: Level[] = ([1, 2, 3, 4, 5] as LevelId[]).map(buildLevel)

export const ALL_WORDS: SightWord[] = LEVELS.flatMap((level) => level.words)

const WORDS_BY_ID = new Map(ALL_WORDS.map((word) => [word.id, word]))

// A word id collision would silently drop a word here and merge two words'
// progress records, so fail loudly in development instead.
if (import.meta.env.DEV && WORDS_BY_ID.size !== ALL_WORDS.length) {
  const seen = new Set<string>()
  const duplicates = ALL_WORDS.map((w) => w.id).filter((id) => !seen.add(id))
  console.error('[words] duplicate word ids:', [...new Set(duplicates)])
}

export function getWord(id: string): SightWord | undefined {
  return WORDS_BY_ID.get(id)
}

export function getLevel(id: LevelId): Level | undefined {
  return LEVELS.find((level) => level.id === id)
}
