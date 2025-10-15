import {allTrue, updateInventoryValueAndTotalProfit} from "./main.js";

function handleCheckboxes(checkboxes) {
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('click', (event) => {
            if(event.target.name === 'sold_cm'){
                event.target.previousElementSibling.checked = false;
            }else if(event.target.name === 'sold'){
                event.target.nextElementSibling.checked = false;
            }
        });
    });
}

export function createNewCard(newCard){
     newCard.querySelectorAll('input').forEach(el =>{
            if (el.type == 'checkbox') {
                el.checked = false;
            } else{
                el.value = '';
            }
        });

        newCard.querySelectorAll('select').forEach(sel => {
        sel.selectedIndex = 1;
        });

        const newCardName = newCard.querySelector('.marketValue');
        newCardName.oninput = function () {
        handleCardInput(this);
        }
        const checkboxes = newCard.querySelectorAll('input[type=checkbox]');
        handleCheckboxes(checkboxes);
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
        this.cardNum = null;
        this.condition = null;
        this.buyPrice = null;
        this.marketValue = null;
        this.sellPrice = null;
        this.checkbox = null;
        this.checkbox_cm = null;
        this.profit = null;
        this.soldDate = null;
    }
}

const checkboxes = document.querySelectorAll('input[type=checkbox]');
handleCheckboxes(checkboxes);
const cardsArr = [];
let totalSellValue = 0;
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
        const input = (selector) => ell.querySelector(selector)?.value.trim().toUpperCase() || null;
        const inputNumber = (selector) => {
            const val = ell.querySelector(selector)?.value.trim();
                if(!val){
                    return null;
                }
            return parseFloat(val.replace(',', '.'));
        };
        card.cardName = input('input[name=cardName]');
        card.cardNum = input('input[name=cardNum]');
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
        if(card.buyPrice === null){
            card.buyPrice = (card.marketValue * 0.80).toFixed(2);
        }
        if(card.checkbox){
            totalSellValue += card.sellPrice;
            card.soldDate = date
        } else if(card.checkbox_cm){
            totalSellValue += (card.sellPrice * 0.95)
            card.soldDate = date
        }
        if(card.cardName !== null && card.marketValue !== null){
            cardsArr.push(card);
        }
    });

    const currentAuctionProfit = totalSellValue - cardsArr[0].buy;
    cardsArr[0].profit = parseFloat(currentAuctionProfit.toFixed(2));

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


document.addEventListener('DOMContentLoaded', async () => {
    await updateInventoryValueAndTotalProfit();
}, false);
