import {createNewCard, struct} from './addAuction.js'

const cardsArr = [];
const saveButton = document.querySelector('.save-btn')

saveButton.addEventListener('click', () => {
    let auction = {
        profit: null,
    };
    if(cardsArr.length === 0){
        cardsArr.push(auction);
    }

    const cards = document.querySelectorAll('.card');
        cards.forEach(ell =>{
            let card = new struct();
            const input = (selector) => ell.querySelector(selector)?.value.trim() || null;
            const inputNumber = (selector) => {
                const val = ell.querySelector(selector)?.value.trim();
                    if(!val){
                        return null;
                    }
                return parseFloat(val.replace(',', '.'));
            };
            card.cardName = input('input[name=cardName]');
            card.condition = input('select[name=condition]');
            card.buyPrice = inputNumber('input[name=buyPrice]');
            card.marketValue = inputNumber('input[name=marketValue]');
            card.sellPrice = inputNumber('input[name=sellPrice]');
            card.checkbox = ell.querySelector('input[name=sold]').checked;
            card.checkbox_cm = ell.querySelector('input[name=sold_cm]').checked;
            card.profit = inputNumber('input[name=profit]');
            if(card.sellPrice === null){
            card.sellPrice = card.marketValue;
            }
            if(card.checkbox === true && card.sellPrice !== null && card.buyPrice !==null){
                card.profit = card.sellPrice - card.buyPrice;
            }
            if(card.checkbox_cm === true && card.sellPrice !== null && card.buyPrice !==null){
                card.profit = (card.sellPrice - card.buyPrice) * 0.95;
            }
            if(card.cardName !== null && card.marketValue !== null){
                cardsArr.push(card);
            }
        });

        let profit = 0;
        for(let i = 1; i < cardsArr.length; i++){
            profit += cardsArr[i].profit || 0;
        }
        cardsArr[0].profit = profit;

        if (cardsArr.length !== 1){
            const jsonbody = JSON.stringify(cardsArr);
            fetch('/addToSingles', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: jsonbody,
            })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    window.location.href = '/';
                }
            })
                .catch(error => {
                    console.error('Error:', error);
                });
        }
});

const addCardButton = document.querySelector('.add-card');
addCardButton.addEventListener('click', () =>{
    const cards = document.querySelectorAll('.card');
    const card = cards[0];
    const container = document.querySelector(".cards-container")
    const newCard = createNewCard(card.cloneNode(true));
})
