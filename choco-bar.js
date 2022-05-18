// $("#choc").mouseover(
//     function() {
//         $(this).find('#old_bar').animate({
//             right: '1500px'
//         }, 500);
//     }
// );


const hero = document.querySelector('.hero');
const slider = document.querySelector('.slider');
const logo = document.querySelector('#logo');

const tl = new TimelineMax();

tl.fromTo(hero, 1.2, { height: "100%" }, { height: "250%", ease: Power2.easeInOut })
    .fromTo(hero, 1.2, { width: "100%" }, { height: "250%", ease: Power2.easeInOut }, "-=1.2")
    .fromTo(hero, 2.0, { x: "0%" }, { x: "-300%", ease: Power2.easeInOut }, "-=0.0")
    .fromTo(slider, 0.7, { x: "-100%" }, { x: "0%", ease: Power2.easeInOut }, "-=0.5")