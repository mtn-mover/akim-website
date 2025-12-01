// JavaScript Document


$(document).ready(function() {
	$('a[href*=#]').bind("click", function(event) {
		event.preventDefault();
		var ziel = $(this).attr("href");
                
                if ($.browser.opera) {
                    var target = 'html';
                }else{
                    var target = 'html,body';
                }

		$(target).animate({
			scrollTop: $(ziel).offset().top
		}, 2000 , function (){location.hash = ziel;});
});
return false;
});
