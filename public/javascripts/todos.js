$("ul").on("click","li",function(){
    $(this).toggleClass("taskCompleted");
})
$("ul").on("click","span",function(event){
    $(this).parent().fadeOut(500,function(){
        $(this).remove();
    });
    event.stopPropagation()
})
// $("input[type='text']").keypress(function(event){
//     if(event.which===13){
//         var text = $(this).val();
//         $(this).val("");
//         $("ul").append("<li><span><i class='fas fa-trash'></i></span> "+text+"</li>");
//     }
// })
$(".fa-plus").click(function(){
    $("input[type='text']").fadeToggle(500);
})
let col=randomcol;
$("h1").css("background-color",col);
$(".delet").css("background-color",$("h1").css("background-color"));
// $(".setColor").css("background-color",col);
function randomcol(){
    let r=Math.floor(Math.random() * 250);
    let g=Math.floor(Math.random() * 250);
    let b=Math.floor(Math.random() * 250);
    
    return "rgb(" + r + ", " + g + ", " + b + ")";
    }
