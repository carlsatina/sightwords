import type { StoredLanguage } from '@/types'
import { wordLevel } from '@/data/build'

/**
 * Filipino early-reading words.
 *
 * ⚠️ NEEDS REVIEW BY A FILIPINO READING TEACHER.
 *
 * Unlike the English list — which follows the published Dolch groupings — this
 * list is not reproduced from a canonical source. There is no single widely
 * published Filipino sight-word list equivalent to Dolch, so these words were
 * chosen for frequency in everyday Filipino and for the order an early reader
 * plausibly meets them. The grouping is a reasonable starting point, not an
 * authority. A parent or teacher should review the level assignments before a
 * child works through them.
 *
 * Filipino is highly phonetic, so decoding matters more here than whole-word
 * recognition; the early levels lean on function words (markers, pronouns)
 * that a child cannot sound out their way to understanding.
 */
export const FILIPINO: StoredLanguage = {
  code: 'fil',
  name: 'Filipino',
  endonym: 'Filipino',
  speechLang: 'fil-PH',
  /**
   * Most desktop browsers and iOS ship no fil-PH voice, so Spanish stands in.
   * It is a genuine approximation, not an equivalent: Filipino and Spanish are
   * both five-vowel and largely phonetic, which carries most words, but
   * Spanish reads `h` as silent (hindi → "indi"), splits the `ng` digraph that
   * Filipino pronounces as one sound (ang, ng, nang), and applies its own
   * stress rules. Latin American variants come first because Castilian's `c`/`z`
   * "th" has no Filipino counterpart.
   */
  fallbackSpeechLangs: ['es-MX', 'es-419', 'es-US', 'es-ES', 'es'],
  levels: [
    wordLevel(1, {
      name: 'Unang Salita',
      blurb: 'The first words a new Filipino reader meets.',
      ageRange: 'Kinder 1 · Ages 3–4',
      accent: 'mint',
    }, [
      ['ako', 'Ako si Ana.', 'I, me', 'I am Ana.'],
      ['ang', 'Ang aso ay tumatakbo.', 'the (marks the subject)', 'The dog is running.'],
      ['at', 'Si Ana at si Ben ay magkaibigan.', 'and', 'Ana and Ben are friends.'],
      ['ay', 'Ang bata ay masaya.', 'is, are (links the sentence)', 'The child is happy.'],
      ['ba', 'Gusto mo ba ito?', '(makes it a question)', 'Do you like this?'],
      ['bata', 'Ang bata ay naglalaro.', 'child', 'The child is playing.'],
      ['ikaw', 'Ikaw ang kaibigan ko.', 'you', 'You are my friend.'],
      ['ina', 'Mahal ko ang aking ina.', 'mother', 'I love my mother.'],
      ['isa', 'May isa akong mansanas.', 'one', 'I have one apple.'],
      ['ito', 'Ito ang libro ko.', 'this', 'This is my book.'],
      ['ka', 'Kumain ka na ba?', 'you', 'Have you eaten?'],
      ['kami', 'Kami ay naglalaro sa labas.', 'we (not you)', 'We are playing outside.'],
      ['ko', 'Ito ang bahay ko.', 'my, by me', 'This is my house.'],
      ['mo', 'Ano ang pangalan mo?', 'your, by you', 'What is your name?'],
      ['na', 'Tapos na ang klase.', 'already, now', 'The class is over.'],
      ['ng', 'Ang bahay ng aso ay maliit.', 'of', 'The dog’s house is small.'],
      ['oo', 'Oo, gusto ko iyan.', 'yes', 'Yes, I like that.'],
      ['po', 'Salamat po sa tulong.', '(shows respect)', 'Thank you for the help.'],
      ['sa', 'Pumunta kami sa parke.', 'to, in, at', 'We went to the park.'],
      ['si', 'Si Ben ay masipag.', '(marks a person’s name)', 'Ben is hardworking.'],
      ['tatay', 'Ang tatay ko ay nagtatrabaho.', 'dad', 'My dad is working.'],
      ['nanay', 'Nagluluto ang nanay ng pagkain.', 'mum', 'Mum is cooking food.'],
      ['bahay', 'Malaki ang bahay nila.', 'house', 'Their house is big.'],
      ['aso', 'Ang aso ay tumatahol.', 'dog', 'The dog is barking.'],
      ['pusa', 'Natutulog ang pusa.', 'cat', 'The cat is sleeping.'],
    ]),
    wordLevel(2, {
      name: 'Lumalago',
      blurb: 'Short words that hold a Filipino sentence together.',
      ageRange: 'Kinder 2 · Ages 4–5',
      accent: 'marigold',
    }, [
      ['siya', 'Siya ang guro namin.', 'he, she', 'They are our teacher.'],
      ['sila', 'Sila ay kumakain.', 'they', 'They are eating.'],
      ['kayo', 'Saan kayo pupunta?', 'you (more than one)', 'Where are you all going?'],
      ['tayo', 'Tayo na sa paaralan.', 'we (including you)', 'Let’s go to school.'],
      ['iyan', 'Ano iyan sa kamay mo?', 'that', 'What is that in your hand?'],
      ['iyon', 'Iyon ang paborito ko.', 'that one over there', 'That one is my favourite.'],
      ['dito', 'Halika dito sa tabi ko.', 'here', 'Come here beside me.'],
      ['doon', 'Pumunta sila doon sa hardin.', 'there', 'They went there to the garden.'],
      ['may', 'May bagong laruan ako.', 'there is, has', 'I have a new toy.'],
      ['wala', 'Wala nang tubig sa baso.', 'none, nothing', 'There is no more water in the glass.'],
      ['hindi', 'Hindi ako inaantok.', 'no, not', 'I am not sleepy.'],
      // din/rin alternate by the preceding sound; the sentence has to use the
      // form the card teaches, so this one follows a consonant.
      ['din', 'Masarap din ang mangga.', 'also, too', 'The mango is tasty too.'],
      ['lang', 'Isa lang ang natira.', 'only, just', 'Only one is left.'],
      ['pa', 'Gusto ko pa ng kanin.', 'still, yet', 'I want more rice.'],
      ['kung', 'Pupunta kami kung maaraw.', 'if', 'We will go if it is sunny.'],
      ['dahil', 'Ngumiti ako dahil masaya ako.', 'because', 'I smiled because I am happy.'],
      ['para', 'Ito ay para sa iyo.', 'for', 'This is for you.'],
      ['saan', 'Saan ka nakatira?', 'where', 'Where do you live?'],
      ['ano', 'Ano ang ginagawa mo?', 'what', 'What are you doing?'],
      ['sino', 'Sino ang kasama mo?', 'who', 'Who is with you?'],
      ['kanin', 'Kumain kami ng kanin.', 'cooked rice', 'We ate rice.'],
      ['tubig', 'Uminom ka ng tubig.', 'water', 'Drink water.'],
      ['araw', 'Mainit ang araw ngayon.', 'sun, day', 'The sun is hot today.'],
      ['gabi', 'Natutulog kami sa gabi.', 'night', 'We sleep at night.'],
      ['libro', 'Binabasa ko ang libro.', 'book', 'I am reading the book.'],
      ['paaralan', 'Pumunta kami sa paaralan.', 'school', 'We went to school.'],
    ]),
    wordLevel(3, {
      name: 'Kuwentuhan',
      blurb: 'Words that show up in every Filipino storybook.',
      ageRange: 'Grade 1–2 · Ages 5–7',
      accent: 'coral',
    }, [
      ['maganda', 'Maganda ang bulaklak.', 'beautiful', 'The flower is beautiful.'],
      ['mabait', 'Mabait ang kapitbahay namin.', 'kind', 'Our neighbour is kind.'],
      ['malaki', 'Malaki ang puno sa likod-bahay.', 'big', 'The tree in the backyard is big.'],
      ['maliit', 'Maliit ang kuting.', 'small', 'The kitten is small.'],
      ['masaya', 'Masaya kami sa piknik.', 'happy', 'We are happy at the picnic.'],
      ['malungkot', 'Malungkot siya kahapon.', 'sad', 'They were sad yesterday.'],
      ['mainit', 'Mainit ang sabaw.', 'hot', 'The soup is hot.'],
      ['malamig', 'Malamig ang hangin sa umaga.', 'cold', 'The air is cold in the morning.'],
      ['kaibigan', 'Matalik kong kaibigan si Ana.', 'friend', 'Ana is my close friend.'],
      ['guro', 'Ang guro ay nagtuturo.', 'teacher', 'The teacher is teaching.'],
      ['pamilya', 'Kumakain ang pamilya nang magkasama.', 'family', 'The family eats together.'],
      ['kapatid', 'May dalawa akong kapatid.', 'brother or sister', 'I have two siblings.'],
      ['umaga', 'Gumigising ako nang umaga.', 'morning', 'I wake up in the morning.'],
      ['hapon', 'Naglalaro kami tuwing hapon.', 'afternoon', 'We play every afternoon.'],
      ['kahapon', 'Umulan kahapon.', 'yesterday', 'It rained yesterday.'],
      ['ngayon', 'Ngayon ang kaarawan ko.', 'now, today', 'Today is my birthday.'],
      ['bukas', 'Bukas kami aalis.', 'tomorrow', 'We are leaving tomorrow.'],
      ['tumakbo', 'Tumakbo ang bata sa parke.', 'ran', 'The child ran in the park.'],
      ['lumakad', 'Lumakad kami papuntang tindahan.', 'walked', 'We walked to the store.'],
      ['kumain', 'Kumain kami ng hapunan.', 'ate', 'We ate dinner.'],
      ['uminom', 'Uminom siya ng gatas.', 'drank', 'They drank milk.'],
      ['natulog', 'Natulog ako nang maaga.', 'slept', 'I slept early.'],
      ['nakita', 'Nakita ko ang bahaghari.', 'saw', 'I saw the rainbow.'],
      ['sabi', 'Sabi ng nanay, maghugas ng kamay.', 'said', 'Mum said, wash your hands.'],
      ['gusto', 'Gusto kong magbasa.', 'like, want', 'I like to read.'],
      ['alam', 'Alam ko ang sagot.', 'know', 'I know the answer.'],
    ]),
    wordLevel(4, {
      name: 'Batikang Mambabasa',
      blurb: 'Longer words for a reader who is ready.',
      ageRange: 'Grade 3–4 · Ages 8–10',
      accent: 'grape',
    }, [
      ['kalikasan', 'Dapat nating alagaan ang kalikasan.', 'nature', 'We should take care of nature.'],
      ['kasaysayan', 'Pinag-aaralan namin ang kasaysayan ng bansa.', 'history', 'We are studying the country’s history.'],
      ['karanasan', 'Malaking karanasan ang paglalakbay.', 'experience', 'Travelling is a big experience.'],
      ['katotohanan', 'Sinabi niya ang katotohanan.', 'truth', 'They told the truth.'],
      ['pananagutan', 'May pananagutan tayo sa isa’t isa.', 'responsibility', 'We have a responsibility to each other.'],
      ['kabutihan', 'Ang kabutihan ay nagbabalik.', 'goodness', 'Goodness comes back to you.'],
      ['pagkakaibigan', 'Matibay ang aming pagkakaibigan.', 'friendship', 'Our friendship is strong.'],
      ['tagumpay', 'Ipinagdiwang namin ang tagumpay.', 'success', 'We celebrated the success.'],
      ['pangarap', 'Ang pangarap ko ay maging doktor.', 'dream', 'My dream is to become a doctor.'],
      ['kalayaan', 'Ipinagdiriwang natin ang kalayaan tuwing Hunyo.', 'freedom', 'We celebrate freedom every June.'],
      ['bayanihan', 'Nagtulungan sila sa diwa ng bayanihan.', 'people helping each other', 'They helped each other in the spirit of bayanihan.'],
      ['masipag', 'Masipag magtrabaho ang aking ama.', 'hardworking', 'My father works hard.'],
      ['matapang', 'Matapang ang batang humarap sa madla.', 'brave', 'The child who faced the crowd was brave.'],
      ['matiyaga', 'Matiyaga siyang nag-aaral tuwing gabi.', 'patient', 'They study patiently every night.'],
      ['magalang', 'Magalang siyang makipag-usap sa nakatatanda.', 'polite', 'They speak politely to their elders.'],
      ['payapa', 'Payapa ang nayon sa gabi.', 'peaceful', 'The village is peaceful at night.'],
      ['maingat', 'Maingat siyang tumawid sa kalsada.', 'careful', 'They crossed the road carefully.'],
      ['pagsubok', 'Hinarap niya ang bawat pagsubok.', 'a challenge', 'They faced every challenge.'],
      ['pagkakataon', 'Binigyan siya ng pangalawang pagkakataon.', 'a chance', 'They were given a second chance.'],
      ['halimbawa', 'Magbigay ka ng halimbawa.', 'example', 'Give an example.'],
      ['kahulugan', 'Hinanap ko ang kahulugan ng salita.', 'meaning', 'I looked up the meaning of the word.'],
      ['larawan', 'Iginuhit niya ang larawan ng dagat.', 'picture', 'They drew a picture of the sea.'],
      ['himpapawid', 'Lumipad ang ibon sa himpapawid.', 'sky', 'The bird flew into the sky.'],
      ['karagatan', 'Malawak ang karagatan sa paligid ng bansa.', 'ocean', 'The ocean around the country is wide.'],
      ['pamayanan', 'Nagtulungan ang buong pamayanan.', 'community', 'The whole community helped each other.'],
      ['kinabukasan', 'Pinaghahandaan namin ang kinabukasan.', 'the future', 'We are preparing for the future.'],
    ]),
  ],
}
