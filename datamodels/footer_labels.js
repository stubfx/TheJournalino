import {rndArrayItem} from "../utils.js";

const phrases = [
    "Believe in yourself.",
    "Success is not final, failure is not fatal: it is the courage to continue that counts.",
    "Don't watch the clock; do what it does. Keep going.",
    "The only way to do great work is to love what you do.",
    "It does not matter how slowly you go as long as you do not stop.",
    "Success is the sum of small efforts, repeated day in and day out.",
    "Motivation gets you started, habit keeps you going.",
    "Your only limit is the one you set for yourself.",
    "Hardships often prepare ordinary people for an extraordinary destiny.",
    "The only limit to our realization of tomorrow will be our doubts of today.",
    "The best way to predict the future is to create it.",
    "The best time to plant a tree was 20 years ago. The second best time is now.",
    "The secret of getting ahead is getting started.",
    "No one can make you feel inferior without your consent.",
    "The only thing standing between you and your goal is the story you keep telling yourself that you can't achieve it.",
    "You miss 100% of the shots you don’t take.",
    "Successful people do what unsuccessful people are not willing to do.",
    "The only way to do great work is to love what you do. If you haven't found it yet, keep looking. Don't settle.",
    "Success is not how high you have climbed, but how you make a positive difference to the world.",
    "The more you learn, the more you earn.",
    "Action is the foundational key to all success.",
    "Inaction breeds doubt and fear. Action breeds confidence and courage.",
    "Don't wait for opportunity. Create it.",
    "The best preparation for tomorrow is doing your best today.",
    "Great things never come from comfort zones.",
    "The future belongs to those who believe in the beauty of their dreams.",
    "You can't build a reputation on what you are going to do.",
    "Positive anything is better than negative nothing.",
    "It always seems impossible until it's done.",
    "The only limit to our growth is the limitations we set for ourselves.",
    "You are never too old to set another goal or to dream a new dream.",
];

export function getPhrase() {
    return rndArrayItem(phrases)
}