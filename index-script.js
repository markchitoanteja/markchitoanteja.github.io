// Close mobile menu on link click
function closeMenu() {
    const menu = document.querySelector('#menu');

    if (menu.classList.contains('show')) {
        const toggler = document.querySelector('.navbar-toggler');
        toggler.click();
    }
}

$(function () {

    // Smooth scroll
    $('a[href^="#"]').on('click', function (e) {

        let target = $(this.getAttribute('href'));

        if (target.length) {

            e.preventDefault();

            $('html, body').animate({
                scrollTop: target.offset().top - 80
            }, 900);

        }

    });

    // Window scroll
    $(window).on('scroll', function () {

        // Navbar shadow
        if ($(window).scrollTop() > 50) {
            $('.navbar').addClass('scrolled');
        } else {
            $('.navbar').removeClass('scrolled');
        }

        // Reveal animation
        $('.reveal').each(function () {

            let top = $(this).offset().top;
            let win = $(window).scrollTop();
            let height = $(window).height();

            if (top < win + height - 100) {
                $(this).addClass('active');
            }

        });

        // Active navbar section
        let scrollPos = $(window).scrollTop() + 120;

        $('section[id]').each(function () {

            let top = $(this).offset().top;
            let bottom = top + $(this).outerHeight();
            let id = $(this).attr('id');

            if (scrollPos >= top && scrollPos < bottom) {

                $('.nav-link').removeClass('active');

                $('.nav-link[href="#' + id + '"]').addClass('active');

            }

        });

        // Scroll to top button
        if ($(window).scrollTop() > 300) {
            $('#scrollToTop').addClass('show');
        } else {
            $('#scrollToTop').removeClass('show');
        }

    });

    // Scroll to top click
    $('#scrollToTop').on('click', function () {

        $('html, body').animate({
            scrollTop: 0
        }, 600);

    });

    // Trigger on load
    $(window).trigger('scroll');

});

// Accessibility
document.addEventListener('DOMContentLoaded', function () {

    const links = document.querySelectorAll('a[href^="#"]');

    links.forEach(link => {

        link.addEventListener('keydown', function (e) {

            if (e.key === 'Enter') {
                this.click();
            }

        });

    });

});