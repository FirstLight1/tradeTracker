export function createNewCard(newCard){
     newCard.querySelectorAll('input').forEach(el =>{
            if (el.type == 'checkbox') {
                el.checked = false;
            } else{
                el.value = '';
            }
        });

        newCard.querySelectorAll('select').forEach(sel => {
        sel.selectedIndex = 0;
        });

        const newCardName = newCard.querySelector('.marketValue');
        newCardName.oninput = function () {
        handleCardInput(this);
        }
        return newCard;
}


window.handleCardInput = function (input){
    const container = document.querySelector(".cards-container")
    const cards = document.querySelectorAll(".card")
    const currentCard = input.closest('.card');
    const lastCard = cards[cards.length - 1];

    if(currentCard == lastCard && input.value.trim() !== ''){
        const newCard = createNewCard(lastCard.cloneNode(true));
        container.appendChild(newCard)
    }
}

export class struct{
    constructor(){
        this.cardName = null;
        this.condition = null;
        this.buyPrice = null;
        this.marketValue = null;
        this.sellPrice = null;
        this.checkbox = null;
        this.profit = null;
    }
}

const cardsArr = [];
const saveButton = document.querySelector('.save-btn')
//add typechecks
saveButton.addEventListener('click', () =>{
    const auctionName = document.querySelector('.auction-name').value;
    const auctionBuy = document.querySelector('.auction-buy-price').value;
    const auctionProfit = document.querySelector('.auction-profit').value;
    const date = new Date().toISOString();
    let auction = {
        name: auctionName.trim() || null,
        buy: auctionBuy ? parseFloat(auctionBuy.replace(',','.')) : null,
        profit: auctionProfit ? parseFloat(auctionProfit.replace(',','.')) : null,
        date: date.trim() || null
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
        card.profit = inputNumber('input[name=profit]');
        if(card.checkbox === true && card.sellPrice !== null && card.buyPrice !==null){
            card.profit = card.sellPrice - card.buyPrice;
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
        fetch('/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: jsonbody
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
})

const addCardButton = document.querySelector('.add-card');
addCardButton.addEventListener('click', () =>{
    const cards = document.querySelectorAll('.card');
    const card = cards[0];
    const container = document.querySelector(".cards-container")
    const newCard = createNewCard(card.cloneNode(true));

    container.append(newCard);
})



