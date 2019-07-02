/* Detect-zoom
 * -----------
 * Cross Browser Zoom and Pixel Ratio Detector
 * Version 1.0.4 | Apr 1 2013
 * dual-licensed under the WTFPL and MIT license
 * Maintained by https://github/tombigel
 * Original developer https://github.com/yonran
 */

//AMD and CommonJS initialization copied from https://github.com/zohararad/audio5js
(function (root, ns, factory) {
    "use strict";

    if (typeof (module) !== 'undefined' && module.exports) { // CommonJS
        module.exports = factory(ns, root);
    } else if (typeof (define) === 'function' && define.amd) { // AMD
        define("factory", function () {
            return factory(ns, root);
        });
    } else {
        root[ns] = factory(ns, root);
    }

}(window, 'detectZoom', function () {

    /**
     * Use devicePixelRatio if supported by the browser
     * @return {Number}
     * @private
     */
    var devicePixelRatio = function () {
        return window.devicePixelRatio || 1;
    };

    /**
     * Fallback function to set default values
     * @return {Object}
     * @private
     */
    var fallback = function () {
        return {
            zoom: 1,
            devicePxPerCssPx: 1
        };
    };
    /**
     * IE 8 and 9: no trick needed!
     * TODO: Test on IE10 and Windows 8 RT
     * @return {Object}
     * @private
     **/
    var ie8 = function () {
        var zoom = Math.round((screen.deviceXDPI / screen.logicalXDPI) * 100) / 100;
        return {
            zoom: zoom,
            devicePxPerCssPx: zoom * devicePixelRatio()
        };
    };

    /**
     * For IE10 we need to change our technique again...
     * thanks https://github.com/stefanvanburen
     * @return {Object}
     * @private
     */
    var ie10 = function () {
        var zoom = Math.round((document.documentElement.offsetHeight / window.innerHeight) * 100) / 100;
        return {
            zoom: zoom,
            devicePxPerCssPx: zoom * devicePixelRatio()
        };
    };

    /**
     * Mobile WebKit
     * the trick: window.innerWIdth is in CSS pixels, while
     * screen.width and screen.height are in system pixels.
     * And there are no scrollbars to mess up the measurement.
     * @return {Object}
     * @private
     */
    var webkitMobile = function () {
        var deviceWidth = (Math.abs(window.orientation) == 90) ? screen.height : screen.width;
        var zoom = deviceWidth / window.innerWidth;
        return {
            zoom: zoom,
            devicePxPerCssPx: zoom * devicePixelRatio()
        };
    };

    /**
     * Desktop Webkit
     * the trick: an element's clientHeight is in CSS pixels, while you can
     * set its line-height in system pixels using font-size and
     * -webkit-text-size-adjust:none.
     * device-pixel-ratio: http://www.webkit.org/blog/55/high-dpi-web-sites/
     *
     * Previous trick (used before http://trac.webkit.org/changeset/100847):
     * documentElement.scrollWidth is in CSS pixels, while
     * document.width was in system pixels. Note that this is the
     * layout width of the document, which is slightly different from viewport
     * because document width does not include scrollbars and might be wider
     * due to big elements.
     * @return {Object}
     * @private
     */
    var webkit = function () {
        var important = function (str) {
            return str.replace(/;/g, " !important;");
        };

        var div = document.createElement('div');
        div.innerHTML = "1<br>2<br>3<br>4<br>5<br>6<br>7<br>8<br>9<br>0";
        div.setAttribute('style', important('font: 100px/1em sans-serif; -webkit-text-size-adjust: none; text-size-adjust: none; height: auto; width: 1em; padding: 0; overflow: visible;'));

        // The container exists so that the div will be laid out in its own flow
        // while not impacting the layout, viewport size, or display of the
        // webpage as a whole.
        // Add !important and relevant CSS rule resets
        // so that other rules cannot affect the results.
        var container = document.createElement('div');
        container.setAttribute('style', important('width:0; height:0; overflow:hidden; visibility:hidden; position: absolute;'));
        container.appendChild(div);

        document.body.appendChild(container);
        var zoom = 1000 / div.clientHeight;
        zoom = Math.round(zoom * 100) / 100;
        document.body.removeChild(container);

        return{
            zoom: zoom,
            devicePxPerCssPx: zoom * devicePixelRatio()
        };
    };

    /**
     * no real trick; device-pixel-ratio is the ratio of device dpi / css dpi.
     * (Note that this is a different interpretation than Webkit's device
     * pixel ratio, which is the ratio device dpi / system dpi).
     *
     * Also, for Mozilla, there is no difference between the zoom factor and the device ratio.
     *
     * @return {Object}
     * @private
     */
    var firefox4 = function () {
        var zoom = mediaQueryBinarySearch('min--moz-device-pixel-ratio', '', 0, 10, 20, 0.0001);
        zoom = Math.round(zoom * 100) / 100;
        return {
            zoom: zoom,
            devicePxPerCssPx: zoom
        };
    };

    /**
     * Firefox 18.x
     * Mozilla added support for devicePixelRatio to Firefox 18,
     * but it is affected by the zoom level, so, like in older
     * Firefox we can't tell if we are in zoom mode or in a device
     * with a different pixel ratio
     * @return {Object}
     * @private
     */
    var firefox18 = function () {
        return {
            zoom: firefox4().zoom,
            devicePxPerCssPx: devicePixelRatio()
        };
    };

    /**
     * works starting Opera 11.11
     * the trick: outerWidth is the viewport width including scrollbars in
     * system px, while innerWidth is the viewport width including scrollbars
     * in CSS px
     * @return {Object}
     * @private
     */
    var opera11 = function () {
        var zoom = window.top.outerWidth / window.top.innerWidth;
        zoom = Math.round(zoom * 100) / 100;
        return {
            zoom: zoom,
            devicePxPerCssPx: zoom * devicePixelRatio()
        };
    };

    /**
     * Use a binary search through media queries to find zoom level in Firefox
     * @param property
     * @param unit
     * @param a
     * @param b
     * @param maxIter
     * @param epsilon
     * @return {Number}
     */
    var mediaQueryBinarySearch = function (property, unit, a, b, maxIter, epsilon) {
        var matchMedia;
        var head, style, div;
        if (window.matchMedia) {
            matchMedia = window.matchMedia;
        } else {
            head = document.getElementsByTagName('head')[0];
            style = document.createElement('style');
            head.appendChild(style);

            div = document.createElement('div');
            div.className = 'mediaQueryBinarySearch';
            div.style.display = 'none';
            document.body.appendChild(div);

            matchMedia = function (query) {
                style.sheet.insertRule('@media ' + query + '{.mediaQueryBinarySearch ' + '{text-decoration: underline} }', 0);
                var matched = getComputedStyle(div, null).textDecoration == 'underline';
                style.sheet.deleteRule(0);
                return {matches: matched};
            };
        }
        var ratio = binarySearch(a, b, maxIter);
        if (div) {
            head.removeChild(style);
            document.body.removeChild(div);
        }
        return ratio;

        function binarySearch(a, b, maxIter) {
            var mid = (a + b) / 2;
            if (maxIter <= 0 || b - a < epsilon) {
                return mid;
            }
            var query = "(" + property + ":" + mid + unit + ")";
            if (matchMedia(query).matches) {
                return binarySearch(mid, b, maxIter - 1);
            } else {
                return binarySearch(a, mid, maxIter - 1);
            }
        }
    };

    /**
     * Generate detection function
     * @private
     */
    var detectFunction = (function () {
        var func = fallback;
        //IE8+
        if (!isNaN(screen.logicalXDPI) && !isNaN(screen.systemXDPI)) {
            func = ie8;
        }
        // IE10+ / Touch
        else if (window.navigator.msMaxTouchPoints) {
            func = ie10;
        }
        //Mobile Webkit
        else if ('orientation' in window && typeof document.body.style.webkitMarquee === 'string') {
            func = webkitMobile;
        }
        //WebKit
        else if (typeof document.body.style.webkitMarquee === 'string') {
            func = webkit;
        }
        //Opera
        else if (navigator.userAgent.indexOf('Opera') >= 0) {
            func = opera11;
        }
        //Last one is Firefox
        //FF 18.x
        else if (window.devicePixelRatio) {
            func = firefox18;
        }
        //FF 4.0 - 17.x
        else if (firefox4().zoom > 0.001) {
            func = firefox4;
        }

        return func;
    }());


    return ({

        /**
         * Ratios.zoom shorthand
         * @return {Number} Zoom level
         */
        zoom: function () {
            return detectFunction().zoom;
        },

        /**
         * Ratios.devicePxPerCssPx shorthand
         * @return {Number} devicePxPerCssPx level
         */
        device: function () {
            return detectFunction().devicePxPerCssPx;
        }
    });
}));

var wpcom_img_zoomer = {
        clientHintSupport: {
                gravatar: false,
                files: false,
                photon: false,
                mshots: false,
                staticAssets: false,
                latex: false,
                imgpress: false,
        },
	useHints: false,
	zoomed: false,
	timer: null,
	interval: 1000, // zoom polling interval in millisecond

	// Should we apply width/height attributes to control the image size?
	imgNeedsSizeAtts: function( img ) {
		// Do not overwrite existing width/height attributes.
		if ( img.getAttribute('width') !== null || img.getAttribute('height') !== null )
			return false;
		// Do not apply the attributes if the image is already constrained by a parent element.
		if ( img.width < img.naturalWidth || img.height < img.naturalHeight )
			return false;
		return true;
	},

        hintsFor: function( service ) {
                if ( this.useHints === false ) {
                        return false;
                }
                if ( this.hints() === false ) {
                        return false;
                }
                if ( typeof this.clientHintSupport[service] === "undefined" ) {
                        return false;
                }
                if ( this.clientHintSupport[service] === true ) {
                        return true;
                }
                return false;
        },

	hints: function() {
		try {
			var chrome = window.navigator.userAgent.match(/\sChrome\/([0-9]+)\.[.0-9]+\s/)
			if (chrome !== null) {
				var version = parseInt(chrome[1], 10)
				if (isNaN(version) === false && version >= 46) {
					return true
				}
			}
		} catch (e) {
			return false
		}
		return false
	},

	init: function() {
		var t = this;
		try{
			t.zoomImages();
			t.timer = setInterval( function() { t.zoomImages(); }, t.interval );
		}
		catch(e){
		}
	},

	stop: function() {
		if ( this.timer )
			clearInterval( this.timer );
	},

	getScale: function() {
		var scale = detectZoom.device();
		// Round up to 1.5 or the next integer below the cap.
		if      ( scale <= 1.0 ) scale = 1.0;
		else if ( scale <= 1.5 ) scale = 1.5;
		else if ( scale <= 2.0 ) scale = 2.0;
		else if ( scale <= 3.0 ) scale = 3.0;
		else if ( scale <= 4.0 ) scale = 4.0;
		else                     scale = 5.0;
		return scale;
	},

	shouldZoom: function( scale ) {
		var t = this;
		// Do not operate on hidden frames.
		if ( "innerWidth" in window && !window.innerWidth )
			return false;
		// Don't do anything until scale > 1
		if ( scale == 1.0 && t.zoomed == false )
			return false;
		return true;
	},

	zoomImages: function() {
		var t = this;
		var scale = t.getScale();
		if ( ! t.shouldZoom( scale ) ){
			return;
		}
		t.zoomed = true;
		// Loop through all the <img> elements on the page.
		var imgs = document.getElementsByTagName("img");

		for ( var i = 0; i < imgs.length; i++ ) {
			// Wait for original images to load
			if ( "complete" in imgs[i] && ! imgs[i].complete )
				continue;

			// Skip images that have srcset attributes.
			if ( imgs[i].hasAttribute('srcset') ) {
				continue;
			}

			// Skip images that don't need processing.
			var imgScale = imgs[i].getAttribute("scale");
			if ( imgScale == scale || imgScale == "0" )
				continue;

			// Skip images that have already failed at this scale
			var scaleFail = imgs[i].getAttribute("scale-fail");
			if ( scaleFail && scaleFail <= scale )
				continue;

			// Skip images that have no dimensions yet.
			if ( ! ( imgs[i].width && imgs[i].height ) )
				continue;

			// Skip images from Lazy Load plugins
			if ( ! imgScale && imgs[i].getAttribute("data-lazy-src") && (imgs[i].getAttribute("data-lazy-src") !== imgs[i].getAttribute("src")))
				continue;

			if ( t.scaleImage( imgs[i], scale ) ) {
				// Mark the img as having been processed at this scale.
				imgs[i].setAttribute("scale", scale);
			}
			else {
				// Set the flag to skip this image.
				imgs[i].setAttribute("scale", "0");
			}
		}
	},

	scaleImage: function( img, scale ) {
		var t = this;
		var newSrc = img.src;

                var isFiles = false;
                var isLatex = false;
                var isPhoton = false;

		// Skip slideshow images
		if ( img.parentNode.className.match(/slideshow-slide/) )
			return false;

		// Scale gravatars that have ?s= or ?size=
		if ( img.src.match( /^https?:\/\/([^\/]*\.)?gravatar\.com\/.+[?&](s|size)=/ ) ) {
                        if ( this.hintsFor( "gravatar" ) === true ) {
                                return false;
                        }
			newSrc = img.src.replace( /([?&](s|size)=)(\d+)/, function( $0, $1, $2, $3 ) {
				// Stash the original size
				var originalAtt = "originals",
				originalSize = img.getAttribute(originalAtt);
				if ( originalSize === null ) {
					originalSize = $3;
					img.setAttribute(originalAtt, originalSize);
					if ( t.imgNeedsSizeAtts( img ) ) {
						// Fix width and height attributes to rendered dimensions.
						img.width = img.width;
						img.height = img.height;
					}
				}
				// Get the width/height of the image in CSS pixels
				var size = img.clientWidth;
				// Convert CSS pixels to device pixels
				var targetSize = Math.ceil(img.clientWidth * scale);
				// Don't go smaller than the original size
				targetSize = Math.max( targetSize, originalSize );
				// Don't go larger than the service supports
				targetSize = Math.min( targetSize, 512 );
				return $1 + targetSize;
			});
		}

		// Scale mshots that have width
		else if ( img.src.match(/^https?:\/\/([^\/]+\.)*(wordpress|wp)\.com\/mshots\/.+[?&]w=\d+/) ) {
                        if ( this.hintsFor( "mshots" ) === true ) {
                                return false;
                        }
			newSrc = img.src.replace( /([?&]w=)(\d+)/, function($0, $1, $2) {
				// Stash the original size
				var originalAtt = 'originalw', originalSize = img.getAttribute(originalAtt);
				if ( originalSize === null ) {
					originalSize = $2;
					img.setAttribute(originalAtt, originalSize);
					if ( t.imgNeedsSizeAtts( img ) ) {
						// Fix width and height attributes to rendered dimensions.
						img.width = img.width;
						img.height = img.height;
					}
				}
				// Get the width of the image in CSS pixels
				var size = img.clientWidth;
				// Convert CSS pixels to device pixels
				var targetSize = Math.ceil(size * scale);
				// Don't go smaller than the original size
				targetSize = Math.max( targetSize, originalSize );
				// Don't go bigger unless the current one is actually lacking
				if ( scale > img.getAttribute("scale") && targetSize <= img.naturalWidth )
					targetSize = $2;
				if ( $2 != targetSize )
					return $1 + targetSize;
				return $0;
			});

			// Update height attribute to match width
			newSrc = newSrc.replace( /([?&]h=)(\d+)/, function($0, $1, $2) {
				if ( newSrc == img.src ) {
					return $0;
				}
				// Stash the original size
				var originalAtt = 'originalh', originalSize = img.getAttribute(originalAtt);
				if ( originalSize === null ) {
					originalSize = $2;
					img.setAttribute(originalAtt, originalSize);
				}
				// Get the height of the image in CSS pixels
				var size = img.clientHeight;
				// Convert CSS pixels to device pixels
				var targetSize = Math.ceil(size * scale);
				// Don't go smaller than the original size
				targetSize = Math.max( targetSize, originalSize );
				// Don't go bigger unless the current one is actually lacking
				if ( scale > img.getAttribute("scale") && targetSize <= img.naturalHeight )
					targetSize = $2;
				if ( $2 != targetSize )
					return $1 + targetSize;
				return $0;
			});
		}

		// Scale simple imgpress queries (s0.wp.com) that only specify w/h/fit
		else if ( img.src.match(/^https?:\/\/([^\/.]+\.)*(wp|wordpress)\.com\/imgpress\?(.+)/) ) {
                        if ( this.hintsFor( "imgpress" ) === true ) {
                                return false; 
                        }
			var imgpressSafeFunctions = ["zoom", "url", "h", "w", "fit", "filter", "brightness", "contrast", "colorize", "smooth", "unsharpmask"];
			// Search the query string for unsupported functions.
			var qs = RegExp.$3.split('&');
			for ( var q in qs ) {
				q = qs[q].split('=')[0];
				if ( imgpressSafeFunctions.indexOf(q) == -1 ) {
					return false;
				}
			}
			// Fix width and height attributes to rendered dimensions.
			img.width = img.width;
			img.height = img.height;
			// Compute new src
			if ( scale == 1 )
				newSrc = img.src.replace(/\?(zoom=[^&]+&)?/, '?');
			else
				newSrc = img.src.replace(/\?(zoom=[^&]+&)?/, '?zoom=' + scale + '&');
		}

		// Scale files.wordpress.com, LaTeX, or Photon images (i#.wp.com)
		else if (
			( isFiles = img.src.match(/^https?:\/\/([^\/]+)\.files\.wordpress\.com\/.+[?&][wh]=/) ) ||
			( isLatex = img.src.match(/^https?:\/\/([^\/.]+\.)*(wp|wordpress)\.com\/latex\.php\?(latex|zoom)=(.+)/) ) ||
			( isPhoton = img.src.match(/^https?:\/\/i[\d]{1}\.wp\.com\/(.+)/) )
		) {
                        if ( false !== isFiles && this.hintsFor( "files" ) === true ) {
                                return false
                        }
                        if ( false !== isLatex && this.hintsFor( "latex" ) === true ) {
                                return false
                        }
                        if ( false !== isPhoton && this.hintsFor( "photon" ) === true ) {
                                return false
                        }
			// Fix width and height attributes to rendered dimensions.
			img.width = img.width;
			img.height = img.height;
			// Compute new src
			if ( scale == 1 ) {
				newSrc = img.src.replace(/\?(zoom=[^&]+&)?/, '?');
			} else {
				newSrc = img.src;

				var url_var = newSrc.match( /([?&]w=)(\d+)/ );
				if ( url_var !== null && url_var[2] ) {
					newSrc = newSrc.replace( url_var[0], url_var[1] + img.width );
				}

				url_var = newSrc.match( /([?&]h=)(\d+)/ );
				if ( url_var !== null && url_var[2] ) {
					newSrc = newSrc.replace( url_var[0], url_var[1] + img.height );
				}

				var zoom_arg = '&zoom=2';
				if ( !newSrc.match( /\?/ ) ) {
					zoom_arg = '?zoom=2';
				}
				img.setAttribute( 'srcset', newSrc + zoom_arg + ' ' + scale + 'x' );
			}
		}

		// Scale static assets that have a name matching *-1x.png or *@1x.png
		else if ( img.src.match(/^https?:\/\/[^\/]+\/.*[-@]([12])x\.(gif|jpeg|jpg|png)(\?|$)/) ) {
                        if ( this.hintsFor( "staticAssets" ) === true ) {
                                return false; 
                        }
			// Fix width and height attributes to rendered dimensions.
			img.width = img.width;
			img.height = img.height;
			var currentSize = RegExp.$1, newSize = currentSize;
			if ( scale <= 1 )
				newSize = 1;
			else
				newSize = 2;
			if ( currentSize != newSize )
				newSrc = img.src.replace(/([-@])[12]x\.(gif|jpeg|jpg|png)(\?|$)/, '$1'+newSize+'x.$2$3');
		}

		else {
			return false;
		}

		// Don't set img.src unless it has changed. This avoids unnecessary reloads.
		if ( newSrc != img.src ) {
			// Store the original img.src
			var prevSrc, origSrc = img.getAttribute("src-orig");
			if ( !origSrc ) {
				origSrc = img.src;
				img.setAttribute("src-orig", origSrc);
			}
			// In case of error, revert img.src
			prevSrc = img.src;
			img.onerror = function(){
				img.src = prevSrc;
				if ( img.getAttribute("scale-fail") < scale )
					img.setAttribute("scale-fail", scale);
				img.onerror = null;
			};
			// Finally load the new image
			img.src = newSrc;
		}

		return true;
	}
};

wpcom_img_zoomer.init();
;
/* global pm, wpcom_reblog */

var jetpackLikesWidgetQueue = [];
var jetpackLikesWidgetBatch = [];
var jetpackLikesMasterReady = false;

function JetpackLikespostMessage( message, target ) {
	if ( 'string' === typeof message ){
		try {
			message = JSON.parse( message );
		} catch(e) {
			return;
		}
	}

	pm( {
		target: target,
		type: 'likesMessage',
		data: message,
		origin: '*'
	} );
}

function JetpackLikesBatchHandler() {
	var requests = [];
	jQuery( 'div.jetpack-likes-widget-unloaded' ).each( function() {
		if ( jetpackLikesWidgetBatch.indexOf( this.id ) > -1 ) {
			return;
		}
		jetpackLikesWidgetBatch.push( this.id );
		var regex = /like-(post|comment)-wrapper-(\d+)-(\d+)-(\w+)/,
			match = regex.exec( this.id ),
			info;

		if ( ! match || match.length !== 5 ) {
			return;
		}

		info = {
			blog_id: match[2],
			width:   this.width
		};

		if ( 'post' === match[1] ) {
			info.post_id = match[3];
		} else if ( 'comment' === match[1] ) {
			info.comment_id = match[3];
		}

		info.obj_id = match[4];

		requests.push( info );
	});

	if ( requests.length > 0 ) {
		JetpackLikespostMessage( { event: 'initialBatch', requests: requests }, window.frames['likes-master'] );
	}
}

function JetpackLikesMessageListener( event, message ) {
	var allowedOrigin, $container, $list, offset, rowLength, height, scrollbarWidth;

	if ( 'undefined' === typeof event.event ) {
		return;
	}

	// We only allow messages from one origin
	allowedOrigin = window.location.protocol + '//widgets.wp.com';
	if ( allowedOrigin !== message.origin ) {
		return;
	}

	if ( 'masterReady' === event.event ) {
		jQuery( document ).ready( function() {
			jetpackLikesMasterReady = true;

			var stylesData = {
					event: 'injectStyles'
				},
				$sdTextColor = jQuery( '.sd-text-color' ),
				$sdLinkColor = jQuery( '.sd-link-color' );

			if ( jQuery( 'iframe.admin-bar-likes-widget' ).length > 0 ) {
				JetpackLikespostMessage( { event: 'adminBarEnabled' }, window.frames[ 'likes-master' ] );

				stylesData.adminBarStyles = {
					background: jQuery( '#wpadminbar .quicklinks li#wp-admin-bar-wpl-like > a' ).css( 'background' ),
					isRtl: ( 'rtl' === jQuery( '#wpadminbar' ).css( 'direction' ) )
				};
			}

			// enable reblogs if we're on a single post page
			if ( jQuery( 'body' ).hasClass( 'single' ) ) {
				JetpackLikespostMessage( { event: 'reblogsEnabled' }, window.frames[ 'likes-master' ] );
			}

			if ( ! window.addEventListener ) {
				jQuery( '#wp-admin-bar-admin-bar-likes-widget' ).hide();
			}

			stylesData.textStyles = {
				color:          $sdTextColor.css( 'color' ),
				fontFamily:     $sdTextColor.css( 'font-family' ),
				fontSize:       $sdTextColor.css( 'font-size' ),
				direction:      $sdTextColor.css( 'direction' ),
				fontWeight:     $sdTextColor.css( 'font-weight' ),
				fontStyle:      $sdTextColor.css( 'font-style' ),
				textDecoration: $sdTextColor.css('text-decoration')
			};

			stylesData.linkStyles = {
				color:          $sdLinkColor.css('color'),
				fontFamily:     $sdLinkColor.css('font-family'),
				fontSize:       $sdLinkColor.css('font-size'),
				textDecoration: $sdLinkColor.css('text-decoration'),
				fontWeight:     $sdLinkColor.css( 'font-weight' ),
				fontStyle:      $sdLinkColor.css( 'font-style' )
			};

			JetpackLikespostMessage( stylesData, window.frames[ 'likes-master' ] );

			JetpackLikesBatchHandler();

			jQuery( document ).on( 'inview', 'div.jetpack-likes-widget-unloaded', function() {
				jetpackLikesWidgetQueue.push( this.id );
			});
		});
	}

	if ( 'showLikeWidget' === event.event ) {
		jQuery( '#' + event.id + ' .post-likes-widget-placeholder'  ).fadeOut( 'fast', function() {
			jQuery( '#' + event.id + ' .post-likes-widget' ).fadeIn( 'fast', function() {
				JetpackLikespostMessage( { event: 'likeWidgetDisplayed', blog_id: event.blog_id, post_id: event.post_id, obj_id: event.obj_id }, window.frames['likes-master'] );
			});
		});
	}

	if ( 'clickReblogFlair' === event.event ) {
		wpcom_reblog.toggle_reblog_box_flair( event.obj_id );
	}

	if ( 'showOtherGravatars' === event.event ) {
		$container = jQuery( '#likes-other-gravatars' );
		$list = $container.find( 'ul' );

		$container.hide();
		$list.html( '' );

		$container.find( '.likes-text span' ).text( event.total );

		jQuery.each( event.likers, function( i, liker ) {
			var element = jQuery( '<li><a><img /></a></li>' );
			element.addClass( liker.css_class );

			element.find( 'a' ).
				attr({
					href: liker.profile_URL,
					rel: 'nofollow',
					target: '_parent'
				}).
				addClass( 'wpl-liker' );

			element.find( 'img' ).
				attr({
					src: liker.avatar_URL,
					alt: liker.name
				}).
				css({
					width: '30px',
					height: '30px',
					paddingRight: '3px'
				});

			$list.append( element );
		} );

		offset = jQuery( '[name=\'' + event.parent + '\']' ).offset();

		$container.css( 'left', offset.left + event.position.left - 10 + 'px' );
		$container.css( 'top', offset.top + event.position.top - 33 + 'px' );

		rowLength = Math.floor( event.width / 37 );
		height = ( Math.ceil( event.likers.length / rowLength ) * 37 ) + 13;
		if ( height > 204 ) {
			height = 204;
		}

		$container.css( 'height', height + 'px' );
		$container.css( 'width', rowLength * 37 - 7 + 'px' );

		$list.css( 'width', rowLength * 37 + 'px' );

		$container.fadeIn( 'slow' );

		scrollbarWidth = $list[0].offsetWidth - $list[0].clientWidth;
		if ( scrollbarWidth > 0 ) {
			$container.width( $container.width() + scrollbarWidth );
			$list.width( $list.width() + scrollbarWidth );
		}
	}
}

pm.bind( 'likesMessage', JetpackLikesMessageListener );

jQuery( document ).click( function( e ) {
	var $container = jQuery( '#likes-other-gravatars' );

	if ( $container.has( e.target ).length === 0 ) {
		$container.fadeOut( 'slow' );
	}
});

function JetpackLikesWidgetQueueHandler() {
	var $wrapper, wrapperID, found;
	if ( ! jetpackLikesMasterReady ) {
		setTimeout( JetpackLikesWidgetQueueHandler, 500 );
		return;
	}

	if ( jetpackLikesWidgetQueue.length > 0 ) {
		// We may have a widget that needs creating now
		found = false;
		while( jetpackLikesWidgetQueue.length > 0 ) {
			// Grab the first member of the queue that isn't already loading.
			wrapperID = jetpackLikesWidgetQueue.splice( 0, 1 )[0];
			if ( jQuery( '#' + wrapperID ).hasClass( 'jetpack-likes-widget-unloaded' ) ) {
				found = true;
				break;
			}
		}
		if ( ! found ) {
			setTimeout( JetpackLikesWidgetQueueHandler, 500 );
			return;
		}
	} else if ( jQuery( 'div.jetpack-likes-widget-unloaded' ).length > 0 ) {
		// Grab any unloaded widgets for a batch request
		JetpackLikesBatchHandler();

		// Get the next unloaded widget
		wrapperID = jQuery( 'div.jetpack-likes-widget-unloaded' ).first()[0].id;
		if ( ! wrapperID ) {
			// Everything is currently loaded
			setTimeout( JetpackLikesWidgetQueueHandler, 500 );
			return;
		}
	}

	if ( 'undefined' === typeof wrapperID ) {
		setTimeout( JetpackLikesWidgetQueueHandler, 500 );
		return;
	}

	$wrapper = jQuery( '#' + wrapperID );
	$wrapper.find( 'iframe' ).remove();

	if ( $wrapper.hasClass( 'slim-likes-widget' ) ) {
		$wrapper.find( '.post-likes-widget-placeholder' ).after( '<iframe class="post-likes-widget jetpack-likes-widget" name="' + $wrapper.data( 'name' ) + '" height="22px" width="68px" frameBorder="0" scrolling="no" src="' + $wrapper.data( 'src' ) + '"></iframe>' );
	} else {
		$wrapper.find( '.post-likes-widget-placeholder' ).after( '<iframe class="post-likes-widget jetpack-likes-widget" name="' + $wrapper.data( 'name' ) + '" height="55px" width="100%" frameBorder="0" src="' + $wrapper.data( 'src' ) + '"></iframe>' );
	}

	$wrapper.removeClass( 'jetpack-likes-widget-unloaded' ).addClass( 'jetpack-likes-widget-loading' );

	$wrapper.find( 'iframe' ).load( function( e ) {
		var $iframe = jQuery( e.target );
		$wrapper.removeClass( 'jetpack-likes-widget-loading' ).addClass( 'jetpack-likes-widget-loaded' );

		JetpackLikespostMessage( { event: 'loadLikeWidget', name: $iframe.attr( 'name' ), width: $iframe.width(), domain: window.location.hostname }, window.frames[ 'likes-master' ] );

		if ( $wrapper.hasClass( 'slim-likes-widget' ) ) {
			$wrapper.find( 'iframe' ).Jetpack( 'resizeable' );
		}
	});
	setTimeout( JetpackLikesWidgetQueueHandler, 250 );
}
JetpackLikesWidgetQueueHandler();
;
/**
 * File navigation.js.
 *
 * Handles toggling the navigation menu for small screens and enables TAB key
 * navigation support for dropdown menus.
 */

( function( $ ) {
	var masthead, menuToggle, siteNavContain, siteNavigation;

	function initMainNavigation( container ) {

		// Add dropdown toggle that displays child menu items.
		var dropdownToggle = $( '<button />', { 'class': 'dropdown-toggle', 'aria-expanded': false } )
			.append( screenReaderText.icon_expand )
			.append( $( '<span />', { 'class': 'screen-reader-text', text: screenReaderText.expand } ) );

		container.find( '.menu-item-has-children > a, .page_item_has_children > a' ).after( dropdownToggle );

		// Set the active submenu dropdown toggle button initial state.
		container.find( '.current-menu-ancestor > button' )
			.addClass( 'toggled' )
			.attr( 'aria-expanded', 'true' )
			.find( '.screen-reader-text' )
			.text( screenReaderText.collapse );
		// Set the active submenu initial state.
		container.find( '.current-menu-ancestor > .sub-menu' ).addClass( 'toggled' );

		container.find( '.dropdown-toggle' ).click( function( e ) {
			var _this = $( this ),
				screenReaderSpan = _this.find( '.screen-reader-text' );

			e.preventDefault();
			_this.toggleClass( 'toggled' );
			_this.next( '.children, .sub-menu' ).toggleClass( 'toggled' );

			_this.attr( 'aria-expanded', _this.attr( 'aria-expanded' ) === 'false' ? 'true' : 'false' );

			screenReaderSpan.text( screenReaderSpan.text() === screenReaderText.expand ? screenReaderText.collapse : screenReaderText.expand );
		});
	}

	initMainNavigation( $( '.main-navigation' ) );

	masthead       = $( '#masthead' );
	menuToggle     = masthead.find( '.menu-toggle' );
	siteNavContain = masthead.find( '.main-navigation' );
	siteNavigation = masthead.find( '.main-navigation > div > ul' );

	// Enable menuToggle.
	( function() {

		// Return early if menuToggle is missing.
		if ( ! menuToggle.length ) {
			return;
		}

		// Add an initial value for the attribute.
		menuToggle.attr( 'aria-expanded', 'false' );

		menuToggle.on( 'click.radcliffe_2', function() {
			siteNavContain.toggleClass( 'toggled' );

			$( this ).attr( 'aria-expanded', siteNavContain.hasClass( 'toggled' ) );
		} );
	} )();

	// Fix sub-menus for touch devices and better focus for hidden submenu items for accessibility.
	( function() {
		if ( ! siteNavigation.length || ! siteNavigation.children().length ) {
			return;
		}

		// Toggle `focus` class to allow submenu access on tablets.
		function toggleFocusClassTouchScreen() {
			if ( 'none' === $( '.menu-toggle' ).css( 'display' ) ) {

				$( document.body ).on( 'touchstart.radcliffe_2', function( e ) {
					if ( ! $( e.target ).closest( '.main-navigation li' ).length ) {
						$( '.main-navigation li' ).removeClass( 'focus' );
					}
				} );

				siteNavigation.find( '.menu-item-has-children > a, .page_item_has_children > a' )
					.on( 'touchstart.radcliffe_2', function( e ) {
						var el = $( this ).parent( 'li' );

						if ( ! el.hasClass( 'focus' ) ) {
							e.preventDefault();
							el.toggleClass( 'focus' );
							el.siblings( '.focus' ).removeClass( 'focus' );
						}
					} );

			} else {
				siteNavigation.find( '.menu-item-has-children > a, .page_item_has_children > a' ).unbind( 'touchstart.radcliffe_2' );
			}
		}

		if ( 'ontouchstart' in window ) {
			$( window ).on( 'resize.radcliffe_2', toggleFocusClassTouchScreen );
			toggleFocusClassTouchScreen();
		}

		siteNavigation.find( 'a' ).on( 'focus.radcliffe_2 blur.radcliffe_2', function() {
			$( this ).parents( '.menu-item, .page_item' ).toggleClass( 'focus' );
		} );
	} )();
} )( jQuery );
;
/**
 * File skip-link-focus-fix.js.
 *
 * Helps with accessibility for keyboard only users.
 *
 * Learn more: https://git.io/vWdr2
 */
(function() {
	var isIe = /(trident|msie)/i.test( navigator.userAgent );

	if ( isIe && document.getElementById && window.addEventListener ) {
		window.addEventListener( 'hashchange', function() {
			var id = location.hash.substring( 1 ),
				element;

			if ( ! ( /^[A-z0-9_-]+$/.test( id ) ) ) {
				return;
			}

			element = document.getElementById( id );

			if ( element ) {
				if ( ! ( /^(?:a|select|input|button|textarea)$/i.test( element.tagName ) ) ) {
					element.tabIndex = -1;
				}

				element.focus();
			}
		}, false );
	}
})();
;
/**
 *
 * This is the main JavaScript file for Radcliffe.
 */

( function( $ ) {

	var $window = $( window );

	// Toggle search form.
	function searchToggle() {
		$( '.search-toggle' ).on( 'click', function() {
			$( this ).toggleClass( 'active' );
			$( '.header-search' ).slideToggle();
			$( '.header-search .s' ).focus();
			return false;
		} );
	}

	// Manage full-screen featured images.
	function fullScreenImages() {
		var $entryBackground = $( '.entry-thumbnail' ),
			$heroArea        = $( '.hero-area' ),
			$windowWidth     = $window.width(),
			$height			 = Math.round( $windowWidth / 1.33 );

		if ( $entryBackground ) {
			// if we're on a blog/archive page, there may be more than one
			if ( $entryBackground.length > 1 ){
				$entryBackground.each( function() {
					// reset the height
					$this_height = $height;
					// find the .entry-header height
					$entryHeader = $( this ).siblings( '.entry-header' );
					if ( $height < $entryHeader.outerHeight() ) {
						// pick the taller of the two
						$this_height = $entryHeader.outerHeight();
					}
					$( this ).height( $this_height + 'px' );
				} );
			} else {
				$entryBackground.height( Math.round( $windowWidth / 1.33 ) + 'px' );
			}
		}

		if ( $heroArea && $windowWidth > '768' ) { // Set a fixed height for larger screens
			$heroArea.css( { 'height' : Math.round( $windowWidth / 1.33 ) + 'px', 'min-height' : 'auto' } );
		}
		else if ( $heroArea ) { // Set a min-height for smaller screens
			$heroArea.css( { 'min-height' : Math.round( $windowWidth / 1.33 ) + 'px', 'height' : 'auto' } );
		}
	}

	// Add SVG image zoom icon
	function imageZoomIcon() {
		$( '.single-product div.product .woocommerce-product-gallery .woocommerce-product-gallery__trigger' )
			.empty()
			.append( screenReaderText.icon_zoom );
	}

	// Initialize init on page load.
	$( document ).on( 'ready', function() {
		searchToggle();
		fullScreenImages();
		imageZoomIcon();
	});

	// ...and on each subsequent Infinite Scroll load, as well.
	$( document ).on( 'post-load', function() {
		fullScreenImages();
	});

	// One more time after everything (eg: Custom Fonts) has loaded for better height accuracy
	$( window ).load( function() {
		fullScreenImages();
	});

	// On window resize.
	$( window ).on( 'resize', function() {
		fullScreenImages();
	});

} )( jQuery );
;
( function( $ ) {
	var cookieValue = document.cookie.replace( /(?:(?:^|.*;\s*)eucookielaw\s*\=\s*([^;]*).*$)|^.*$/, '$1' ),
		overlay = $( '#eu-cookie-law' ),
		container = $( '.widget_eu_cookie_law_widget' ),
		initialScrollPosition,
		scrollFunction;

	if ( overlay.hasClass( 'ads-active' ) ) {
		var adsCookieValue = document.cookie.replace( /(?:(?:^|.*;\s*)personalized-ads-consent\s*\=\s*([^;]*).*$)|^.*$/, '$1' );
		if ( '' !== cookieValue && '' !== adsCookieValue ) {
			overlay.remove();
		}
	} else if ( '' !== cookieValue ) {
		overlay.remove();
	}

	$( '.widget_eu_cookie_law_widget' ).appendTo( 'body' ).fadeIn();

	overlay.find( 'form' ).on( 'submit', accept );

	if ( overlay.hasClass( 'hide-on-scroll' ) ) {
		initialScrollPosition = $( window ).scrollTop();
		scrollFunction = function() {
			if ( Math.abs( $( window ).scrollTop() - initialScrollPosition ) > 50 ) {
				accept();
			}
		};
		$( window ).on( 'scroll', scrollFunction );
	} else if ( overlay.hasClass( 'hide-on-time' ) ) {
		setTimeout( accept, overlay.data( 'hide-timeout' ) * 1000 );
	}

	var accepted = false;
	function accept( event ) {
		if ( accepted ) {
			return;
		}
		accepted = true;

		if ( event && event.preventDefault ) {
			event.preventDefault();
		}

		if ( overlay.hasClass( 'hide-on-scroll' ) ) {
			$( window ).off( 'scroll', scrollFunction );
		}

		var expireTime = new Date();
		expireTime.setTime( expireTime.getTime() + ( overlay.data( 'consent-expiration' ) * 24 * 60 * 60 * 1000 ) );

		document.cookie = 'eucookielaw=' + expireTime.getTime() + ';path=/;expires=' + expireTime.toGMTString();
		if ( overlay.hasClass( 'ads-active' ) && overlay.hasClass( 'hide-on-button' ) ) {
			document.cookie = 'personalized-ads-consent=' + expireTime.getTime() + ';path=/;expires=' + expireTime.toGMTString();
		}

		overlay.fadeOut( 400, function() {
			overlay.remove();
			container.remove();
		} );
	}
} )( jQuery );
;
/***
 * Warning: This file is remotely enqueued in Jetpack's Masterbar module.
 * Changing it will also affect Jetpack sites.
 */
jQuery( document ).ready( function( $, wpcom ) {
	var masterbar,
		menupops = $( 'li#wp-admin-bar-blog.menupop, li#wp-admin-bar-newdash.menupop, li#wp-admin-bar-my-account.menupop' ),
		newmenu = $( '#wp-admin-bar-new-post-types' );

	// Unbind hoverIntent, we want clickable menus.
	menupops
		.unbind( 'mouseenter mouseleave' )
		.removeProp( 'hoverIntent_t' )
		.removeProp( 'hoverIntent_s' )
		.on( 'mouseover', function(e) {
			var li = $(e.target).closest( 'li.menupop' );
			menupops.not(li).removeClass( 'ab-hover' );
			li.toggleClass( 'ab-hover' );
		} )
		.on( 'click touchstart', function(e) {
			var $target = $( e.target );

			if ( masterbar.focusSubMenus( $target ) ) {
				return;
			}

			e.preventDefault();
			masterbar.toggleMenu( $target );
		} );

	masterbar = {
		focusSubMenus: function( $target ) {
			// Handle selection of menu items
			if ( ! $target.closest( 'ul' ).hasClass( 'ab-top-menu' ) ) {
				$target
					.closest( 'li' );

				return true;
			}

			return false;
		},

		toggleMenu: function( $target ) {
			var $li = $target.closest( 'li.menupop' ),
				$html = $( 'html' );

			$( 'body' ).off( 'click.ab-menu' );
			$( '#wpadminbar li.menupop' ).not($li).removeClass( 'ab-active wpnt-stayopen wpnt-show' );

			if ( $li.hasClass( 'ab-active' ) ) {
				$li.removeClass( 'ab-active' );
				$html.removeClass( 'ab-menu-open' );
			} else {
				$li.addClass( 'ab-active' );
				$html.addClass( 'ab-menu-open' );

				$( 'body' ).on( 'click.ab-menu', function( e ) {
					if ( ! $( e.target ).parents( '#wpadminbar' ).length ) {
						e.preventDefault();
						masterbar.toggleMenu( $li );
						$( 'body' ).off( 'click.ab-menu' );
					}
				} );
			}
		}
	};
} );;
/*globals JSON */
( function( $ ) {
	var eventName = 'wpcom_masterbar_click';

	var linksTracksEvents = {
		//top level items
		'wp-admin-bar-blog'                        : 'my_sites',
		'wp-admin-bar-newdash'                     : 'reader',
		'wp-admin-bar-ab-new-post'                 : 'write_button',
		'wp-admin-bar-my-account'                  : 'my_account',
		'wp-admin-bar-notes'                       : 'notifications',
		//my sites - top items
		'wp-admin-bar-switch-site'                 : 'my_sites_switch_site',
		'wp-admin-bar-blog-info'                   : 'my_sites_site_info',
		'wp-admin-bar-site-view'                   : 'my_sites_view_site',
		'wp-admin-bar-blog-stats'                  : 'my_sites_site_stats',
		'wp-admin-bar-plan'                        : 'my_sites_plan',
		'wp-admin-bar-plan-badge'                  : 'my_sites_plan_badge',
		//my sites - manage
		'wp-admin-bar-edit-page'                   : 'my_sites_manage_site_pages',
		'wp-admin-bar-new-page-badge'              : 'my_sites_manage_add_page',
		'wp-admin-bar-edit-post'                   : 'my_sites_manage_blog_posts',
		'wp-admin-bar-new-post-badge'              : 'my_sites_manage_add_post',
		'wp-admin-bar-edit-attachment'             : 'my_sites_manage_media',
		'wp-admin-bar-new-attachment-badge'        : 'my_sites_manage_add_media',
		'wp-admin-bar-comments'                    : 'my_sites_manage_comments',
		'wp-admin-bar-edit-jetpack-testimonial'    : 'my_sites_manage_testimonials',
		'wp-admin-bar-new-jetpack-testimonial'     : 'my_sites_manage_add_testimonial',
		'wp-admin-bar-edit-jetpack-portfolio'      : 'my_sites_manage_portfolio',
		'wp-admin-bar-new-jetpack-portfolio'       : 'my_sites_manage_add_portfolio',
		//my sites - personalize
		'wp-admin-bar-themes'                      : 'my_sites_personalize_themes',
		'wp-admin-bar-cmz'                         : 'my_sites_personalize_themes_customize',
		//my sites - configure
		'wp-admin-bar-sharing'                     : 'my_sites_configure_sharing',
		'wp-admin-bar-people'                      : 'my_sites_configure_people',
		'wp-admin-bar-people-add'                  : 'my_sites_configure_people_add_button',
		'wp-admin-bar-plugins'                     : 'my_sites_configure_plugins',
		'wp-admin-bar-domains'                     : 'my_sites_configure_domains',
		'wp-admin-bar-domains-add'                 : 'my_sites_configure_add_domain',
		'wp-admin-bar-blog-settings'               : 'my_sites_configure_settings',
		'wp-admin-bar-legacy-dashboard'            : 'my_sites_configure_wp_admin',
		//reader
		'wp-admin-bar-followed-sites'              : 'reader_followed_sites',
		'wp-admin-bar-reader-followed-sites-manage': 'reader_manage_followed_sites',
		'wp-admin-bar-discover-discover'           : 'reader_discover',
		'wp-admin-bar-discover-search'             : 'reader_search',
		'wp-admin-bar-my-activity-my-likes'        : 'reader_my_likes',
		//account
		'wp-admin-bar-user-info'                   : 'my_account_user_name',
		// account - profile
		'wp-admin-bar-my-profile'                  : 'my_account_profile_my_profile',
		'wp-admin-bar-account-settings'            : 'my_account_profile_account_settings',
		'wp-admin-bar-billing'                     : 'my_account_profile_manage_purchases',
		'wp-admin-bar-security'                    : 'my_account_profile_security',
		'wp-admin-bar-notifications'               : 'my_account_profile_notifications',
		//account - special
		'wp-admin-bar-get-apps'                    : 'my_account_special_get_apps',
		'wp-admin-bar-next-steps'                  : 'my_account_special_next_steps',
		'wp-admin-bar-help'                        : 'my_account_special_help',
	};

	var notesTracksEvents = {
		openSite: function( data ) {
			return {
				clicked: 'masterbar_notifications_panel_site',
				site_id: data.siteId
			};
		},
		openPost: function( data ) {
			return {
				clicked: 'masterbar_notifications_panel_post',
				site_id: data.siteId,
				post_id: data.postId
			};
		},
		openComment: function( data ) {
			return {
				clicked: 'masterbar_notifications_panel_comment',
				site_id: data.siteId,
				post_id: data.postId,
				comment_id: data.commentId
			};
		}
	};

	function recordTracksEvent( eventProps ) {
		eventProps = eventProps || {};
		window._tkq = window._tkq || [];
		window._tkq.push( [ 'recordEvent', eventName, eventProps ] );
	}

	function parseJson( s, defaultValue ) {
		try {
			return JSON.parse( s );
		} catch ( e ) {
			return defaultValue;
		}
	}

	$( document ).ready( function() {
		var trackableLinks = '.mb-trackable .ab-item:not(div),' +
			'#wp-admin-bar-notes .ab-item,' +
			'#wp-admin-bar-user-info .ab-item,' +
			'.mb-trackable .ab-secondary';

		$( trackableLinks ).on( 'click touchstart', function( e ) {
			var $target = $( e.target ),
				$parent = $target.closest( 'li' );

			if ( ! $parent ) {
				return;
			}

			var trackingId = $target.attr( 'ID' ) || $parent.attr( 'ID' );

			if ( ! linksTracksEvents.hasOwnProperty( trackingId ) ) {
				return;
			}

			var eventProps = { 'clicked': linksTracksEvents[ trackingId ] };

			recordTracksEvent( eventProps );
		} );
	} );

	// listen for postMessage events from the notifications iframe
	$( window ).on( 'message', function( e ) {
		var event = ! e.data && e.originalEvent.data ? e.originalEvent : e;
		if ( event.origin !== 'https://widgets.wp.com' ) {
			return;
		}

		var data = ( 'string' === typeof event.data ) ? parseJson( event.data, {} ) : event.data;
		if ( 'notesIframeMessage' !== data.type ) {
			return;
		}

		var eventData = notesTracksEvents[ data.action ];
		if ( ! eventData ) {
			return;
		}

		recordTracksEvent( eventData( data ) );
	} );

} )( jQuery );
;
var wpcom = window.wpcom || {};
wpcom.actionbar = {};
wpcom.actionbar.data = actionbardata;

// This might be better in another file, but is here for now
(function($){
	var fbd = wpcom.actionbar.data,
			d = document,
			docHeight = $( d ).height(),
			b = d.getElementsByTagName( 'body' )[0],
			lastScrollTop = 0,
			lastScrollDir, fb, fhtml, fbhtml, fbHtmlLi,
			followingbtn, followbtn, fbdf, action,
			slkhtml = '', foldhtml = '', reporthtml = '',
			customizeIcon, editIcon, statsIcon, themeHtml = '', signupHtml = '', loginHtml = '',
			viewReaderHtml = '', editSubsHtml = '', editFollowsHtml = '',
			toggleactionbar, $actionbar;

	// Don't show actionbar when iframed
	if ( window != window.top ) {
		return;
	}

	fhtml = '<ul>';

	// Customize Icon
	customizeIcon = '<svg class="gridicon gridicon__customize" height="20px" width="20px" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g><path d="M2 6c0-1.505.78-3.08 2-4 0 .845.69 2 2 2 1.657 0 3 1.343 3 3 0 .386-.08.752-.212 1.09.74.594 1.476 1.19 2.19 1.81L8.9 11.98c-.62-.716-1.214-1.454-1.807-2.192C6.753 9.92 6.387 10 6 10c-2.21 0-4-1.79-4-4zm12.152 6.848l1.34-1.34c.607.304 1.283.492 2.008.492 2.485 0 4.5-2.015 4.5-4.5 0-.725-.188-1.4-.493-2.007L18 9l-2-2 3.507-3.507C18.9 3.188 18.225 3 17.5 3 15.015 3 13 5.015 13 7.5c0 .725.188 1.4.493 2.007L3 20l2 2 6.848-6.848c1.885 1.928 3.874 3.753 5.977 5.45l1.425 1.148 1.5-1.5-1.15-1.425c-1.695-2.103-3.52-4.092-5.448-5.977z" data-reactid=".2.1.1:0.1b.0"></path></g></svg>';

	if ( fbd.canCustomizeSite && fbd.isLoggedIn ) {
		fhtml += '<li class="actnbr-btn actnbr-customize"><a href="'+ fbd.customizeLink +'">' + customizeIcon + '<span>' + fbd.i18n.customize + '<span></a></li>';
	}

	// Edit Icon
	editIcon = '<svg class="gridicon gridicon__pencil" height="20px" width="20px" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g><path d="M13 6l5 5-9.507 9.507c-.686-.686-.69-1.794-.012-2.485l-.002-.003c-.69.676-1.8.673-2.485-.013-.677-.677-.686-1.762-.036-2.455l-.008-.008c-.694.65-1.78.64-2.456-.036L13 6zm7.586-.414l-2.172-2.172c-.78-.78-2.047-.78-2.828 0L14 5l5 5 1.586-1.586c.78-.78.78-2.047 0-2.828zM3 18v3h3c0-1.657-1.343-3-3-3z"></path></g></svg>';

	if ( fbd.canEditPost ) {
		fhtml += '<li class="actnbr-btn actnbr-edit"><a href="'+ fbd.editLink +'">' + editIcon + '<span>' + fbd.i18n.edit + '</span></a></li>';
	}

	// Stats Icon
	statsIcon = '<svg class="gridicon gridicon__stats-alt" height="20px" width="20px" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g><path d="M21,21H3v-2h18V21z M8,10H4v7h4V10z M14,3h-4v14h4V3z M20,6h-4v11h4V6z"/></path></g></svg>';

	if ( fbd.canEditPost ) {
		fhtml += '<li class="actnbr-btn actnbr-stats"><a href="'+ fbd.statsLink +'">' + statsIcon + '<span>' + fbd.i18n.stats + '</span></a></li>';
	}

	// Follow/Unfollow Icon
	followingbtn = '<svg class="gridicon gridicon__following" height="24px" width="24px" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g><path d="M23 13.482L15.508 21 12 17.4l1.412-1.388 2.106 2.188 6.094-6.094L23 13.482zm-7.455 1.862L20 10.89V2H2v14c0 1.1.9 2 2 2h4.538l4.913-4.832 2.095 2.176zM8 13H4v-1h4v1zm3-2H4v-1h7v1zm0-2H4V8h7v1zm7-3H4V4h14v2z"/></g></svg>';
	followbtn = '<svg class="gridicon gridicon__follow" height="24px" width="24px" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g><path d="M23 16v2h-3v3h-2v-3h-3v-2h3v-3h2v3h3zM20 2v9h-4v3h-3v4H4c-1.1 0-2-.9-2-2V2h18zM8 13v-1H4v1h4zm3-3H4v1h7v-1zm0-2H4v1h7V8zm7-4H4v2h14V4z"/></g></svg>';

	fbhtml = '<a class="actnbr-action actnbr-actn-follow" href="">' + followbtn + '<span>' + fbd.i18n.follow + '</span></a>';
	if ( fbd.isFollowing ) {
		fbhtml = '<a class="actnbr-action actnbr-actn-following" href="">' + followingbtn + '<span>' + fbd.i18n.following + '</span></a>';
	}

	// Show follow/unfollow icon on top level, when this is not your own site
	if ( fbd.canFollow && ! ( fbd.canEditPost || fbd.canCustomizeSite ) ) {
		fhtml += '<li class="actnbr-btn actnbr-hidden"> \
			    	' + fbhtml + ' \
			    	<div class="actnbr-popover tip tip-top-left actnbr-notice"> \
			    		<div class="tip-arrow"></div> \
			    		<div class="tip-inner actnbr-follow-bubble"></div> \
			    	</div> \
			    </li>';
	}

	if ( ! fbd.canCustomizeSite ) {
		// Report Link
		reporthtml = '<li class="flb-report"><a href="http://en.wordpress.com/abuse/">' + fbd.i18n.report + '</a></li>';
	}

	// Show shortlink on single posts
	if ( fbd.isSingular ) {
		slkhtml = '<li class="actnbr-shortlink"><a href="' + fbd.shortlink + '">' + fbd.i18n.shortlink + '</a></li>'
	}

	// Set up fold/unfold menu item
	foldhtml = '<li class="actnbr-fold"><a href="">' + fbd.i18n.foldBar + '</a></li>'
	if ( fbd.isFolded ) {
		foldhtml = '<li class="actnbr-fold"><a href="">' + fbd.i18n.unfoldBar + '</a></li>'
	}
	if ( ! fbd.isLoggedIn && ! fbd.canFollow ) {
		foldhtml = '';
	}

	if ( fbd.isLoggedIn ) {
		if ( '' != fbd.themeURL ) {
			themeHtml = '<li class="actnbr-theme"><a href="' + fbd.themeURL + '">' + fbd.i18n.themeInfo.replace( /{theme}/, fbd.themeName ) + '</a></li>';
		}
		if ( fbd.canFollow ) {
			if ( fbd.isSingular ) {
				viewReaderHtml = '<li class="actnbr-reader"><a href="https://wordpress.com/read/blogs/' + fbd.siteID + '/posts/' + fbd.postID +'">' + fbd.i18n.viewReadPost + '</a></li>';
			} else {
				viewReaderHtml = '<li class="actnbr-reader"><a href="https://wordpress.com/read/' + ( fbd.feedID ? 'feeds/' + fbd.feedID : 'blogs/' + fbd.siteID ) + '">' + fbd.i18n.viewReader + '</a></li>';
			}
		}
		editFollowsHtml = '<li class="actnbr-follows"><a href="https://wordpress.com/following/edit">' + fbd.i18n.editSubs + '</a></li>';
	} else {
		loginHtml += '<li class="actnbr-login"><a href="' + fbd.loginURL + '">' + fbd.i18n.login + '</a></li>';
		signupHtml = '<li class="actnbr-signup"><a href="' + fbd.signupURL + '">' + fbd.i18n.signup + '</a></li>';
		editSubsHtml = '<li class="actnbr-subs"><a href="https://subscribe.wordpress.com/">' + fbd.i18n.editSubs + '</a></li>';
	}

	// Hide follow/unfollow completely for static sites, and sites not allowing followers (VIP, private, etc).
	if ( ! fbd.canFollow ) {
		fbHtmlLi = '';
	} else {
		fbHtmlLi = '<li class="actnbr-folded-follow">' + fbhtml + '</li>';
	}

	// Ellipsis Menu
	fhtml += '<li class="actnbr-ellipsis actnbr-hidden"> \
			  <svg class="gridicon gridicon__ellipsis" height="24" width="24" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g><circle cx="5" cy="12" r="2"/><circle cx="19" cy="12" r="2"/><circle cx="12" cy="12" r="2"/></g></svg> \
			  <div class="actnbr-popover tip tip-top-left actnbr-more"> \
			  	<div class="tip-arrow"></div> \
			  	<div class="tip-inner"> \
				  <ul> \
				    <li class="actnbr-sitename"><a href="' + fbd.siteURL + '">' + fbd.icon + ' ' + actionBarEscapeHtml( fbd.siteName ) + '</a></li> \
				   	<li class="actnbr-folded-customize"><a href="'+ fbd.customizeLink +'">' + customizeIcon + '<span>' + fbd.i18n.customize + '<span></a></li> \
				    ' + fbHtmlLi + ' \
					' + signupHtml + ' \
				    ' + loginHtml + ' \
				    ' + themeHtml + ' \
				    ' + slkhtml + ' \
				    ' + reporthtml + ' \
				    ' + viewReaderHtml + ' \
				    ' + editFollowsHtml + ' \
				    ' + editSubsHtml + ' \
				    ' + foldhtml + ' \
			      </ul> \
			    </div> \
		      </div> \
		    </li> \
	      </ul>';

	fbdf = d.createElement( 'div' );
	fbdf.id = 'actionbar';
	fbdf.innerHTML = fhtml;
	b.appendChild( fbdf );

	$actionbar = $( '#actionbar' ).addClass( 'actnbr-' + fbd.themeSlug.replace( '/', '-' ) );

	// Add classes based on contents
	if ( fbd.canCustomizeSite ) {
		$actionbar.addClass( 'actnbr-has-customize' );
	}

	if ( fbd.canEditPost ) {
		$actionbar.addClass( 'actnbr-has-edit' );
	}

	if ( ! fbd.canCustomizeSite ) {
		$actionbar.addClass( 'actnbr-has-follow' );
	}

	if ( fbd.isFolded ) {
		$actionbar.addClass( 'actnbr-folded' );
	}

	// Show status message if available
	if ( fbd.statusMessage ) {
		showActionBarStatusMessage( fbd.statusMessage );
	}

	// *** Actions *****************

	// Follow Site
	$actionbar.on(  'click', '.actnbr-actn-follow', function(e) {
		e.preventDefault();

		if ( fbd.isLoggedIn ) {
			showActionBarStatusMessage( '<div class="actnbr-reader">' + fbd.i18n.followedText + '</div>' );
			bumpStat( 'followed' );
			var eventProps = {
				'follow_source': 'actionbar',
				'url': fbd.siteURL
			};
			recordTracksEvent( 'wpcom_actionbar_site_followed', eventProps );

			request( 'ab_subscribe_to_blog' );
		} else {
			showActionBarFollowForm();
		}
	} )

	// UnFollow Site
	.on(  'click', '.actnbr-actn-following', function(e) {
		e.preventDefault();
		$( '#actionbar .actnbr-actn-following' ).replaceWith( '<a class="actnbr-action actnbr-actn-follow" href="">' + followbtn + '<span>' + fbd.i18n.follow + '</span></a>' );

		bumpStat( 'unfollowed' );
		var eventProps = {
			'follow_source': 'actionbar',
			'url': fbd.siteURL
		};
		recordTracksEvent( 'wpcom_actionbar_site_unfollowed', eventProps );

		request( 'ab_unsubscribe_from_blog' );
	} )

	// Show shortlink prompt
	.on( 'click', '.actnbr-shortlink a', function(e) {
		e.preventDefault();
		window.prompt( "Shortlink: ", fbd.shortlink );
	} )

	// Toggle more menu
	.on( 'click', '.actnbr-ellipsis', function(e) {
		if ( $( e.target ).closest( 'a' ).hasClass( 'actnbr-action' ) ) {
			return false;
		}

		var popoverLi = $( '#actionbar .actnbr-ellipsis' );
		popoverLi.toggleClass( 'actnbr-hidden' );

		setTimeout( function() {
			if ( ! popoverLi.hasClass( 'actnbr-hidden' ) ) {
				bumpStat( 'show_more_menu' );

				$( document ).on( 'click.actnbr-body-click', function() {
					popoverLi.addClass( 'actnbr-hidden' );

					$( document ).off( 'click.actnbr-body-click' );
				} );
			}
		}, 10 );
	})

	// Fold/Unfold
	.on( 'click', '.actnbr-fold', function(e) {
		e.preventDefault();

		if ( $( '#actionbar' ).hasClass( 'actnbr-folded' ) ) {
			$( '.actnbr-fold a' ).html( fbd.i18n.foldBar );
			$( '#actionbar' ).removeClass( 'actnbr-folded' );

			$.post( fbd.xhrURL, { 'action': 'unfold_actionbar' } );
		} else {
			$( '.actnbr-fold a' ).html( fbd.i18n.unfoldBar );
			$( '#actionbar' ).addClass( 'actnbr-folded' );

			$.post( fbd.xhrURL, { 'action': 'fold_actionbar' } );
		}
	})

	// Record stats for clicks
	.on( 'click', '.actnbr-sitename a', createStatsBumperEventHandler( 'clicked_site_title' ) )
	.on( 'click', '.actnbr-customize a', createStatsBumperEventHandler( 'customized' ) )
	.on( 'click', '.actnbr-folded-customize a', createStatsBumperEventHandler( 'customized' ) )
	.on( 'click', '.actnbr-theme a', createStatsBumperEventHandler( 'explored_theme' ) )
	.on( 'click', '.actnbr-edit a', createStatsBumperEventHandler( 'edited' ) )
	.on( 'click', '.actnbr-stats a', createStatsBumperEventHandler( 'clicked_stats' ) )
	.on( 'click', '.flb-report a', createStatsBumperEventHandler( 'reported_content' ) )
	.on( 'click', '.actnbr-follows a', createStatsBumperEventHandler( 'managed_following' ) )
	.on( 'click', '.actnbr-shortlink a', function() {
		bumpStat( 'copied_shortlink' );
	} )
	.on( 'click', '.actnbr-reader a', createStatsBumperEventHandler( 'view_reader' ) )
	.on( 'submit', '.actnbr-follow-bubble form', createStatsBumperEventHandler( 'submit_follow_form', function() {
		$( '#actionbar .actnbr-follow-bubble form button' ).attr( 'disabled', true );
	} ) )
	.on( 'click', '.actnbr-login-nudge a', createStatsBumperEventHandler( 'clicked_login_nudge' ) )
	.on( 'click', '.actnbr-signup a', createStatsBumperEventHandler( 'clicked_signup_link' ) )
	.on( 'click', '.actnbr-login a', createStatsBumperEventHandler( 'clicked_login_link' ) )
	.on( 'click', '.actnbr-subs a', createStatsBumperEventHandler( 'clicked_manage_subs_link' ) );

	// Make Follow/Unfollow requests
	var request = function( action ) {
		$.post( fbd.xhrURL, {
			'action': action,
			'_wpnonce': fbd.nonce,
			'source': 'actionbar',
			'blog_id': fbd.siteID
		});
	};

	// Show/Hide actionbar on scroll
	fb = $('#actionbar');
	toggleactionbar = function() {
		var st = $(window).scrollTop(),
			topOffset = 0;

		if ( $(window).scrollTop() < 0 ) {
			return;
		}

		// Still
		if ( lastScrollTop == 0 || ( ( st == lastScrollTop ) && lastScrollDir == 'up' ) ) {
			fb.removeClass( 'actnbr-hidden' );

		// Moving
		} else {
			 // Scrolling Up
		    if ( st < lastScrollTop ){
				fb.removeClass( 'actnbr-hidden' );
				lastScrollDir = 'up';

			// Scrolling Down
			} else {
				// check if there are any popovers open, and only hide action bar if not
				if ( $( '#actionbar > ul > li:not(.actnbr-hidden) > .actnbr-popover' ).length === 0 ) {
					fb.addClass( 'actnbr-hidden' );
					lastScrollDir = 'down';

					// Hide any menus
					$( '#actionbar li' ).addClass( 'actnbr-hidden' );
				}
			}
		}

		lastScrollTop = st;
	};
	setInterval( toggleactionbar, 100 );

	var bumpStat = function( stat ) {
		return $.post( fbd.xhrURL, {
			'action': 'actionbar_stats',
			'stat': stat
		} );
	};

	var recordTracksEvent =	function( eventName, eventProps ) {
		eventProps = eventProps || {};
		window._tkq = window._tkq || [];
		window._tkq.push( [ 'recordEvent', eventName, eventProps ] );
	};

	/**
	 * A factory method for creating an event handler function that will bump a specific stat and ONLY THEN re-dispatch
	 * the event. This will ensure that the bumped stat is indeed recorded before navigating the page away, as otherwise
	 * some browsers may very well decide to cancel the stat request in that case.
	 *
	 * @param {String} stat the name of the stat to bump
	 * @param {Function} additionalEffect an additional function that should be called after the stat is bumped
	 */
	function createStatsBumperEventHandler( stat, additionalEffect ) {
		var completedEvents = {};

		return function eventHandler( event ) {
			if ( completedEvents[ event.timeStamp ] ) {
				delete completedEvents[ event.timeStamp ];

				// hack-around to submit forms, dispatching "submit" event is not enough for them
				if ( event.type === 'submit' ) {
					event.target.submit();
				}

				if ( typeof additionalEffect === 'function' ) {
					return additionalEffect( event );
				}

				return true;
			}

			event.preventDefault();
			event.stopPropagation();

			function dispatchOriginalEvent() {
				var newEvent;

				// Retrieves the native event object created by the browser from the jQuery event object
				var originalEvent = event.originalEvent;

				/**
				 * Handles Internet Explorer that doesn't support Event nor CustomEvent constructors
				 *
				 * @see https://developer.mozilla.org/en-US/docs/Web/API/Event/Event
				 * @see https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/CustomEvent
				 * @see https://stackoverflow.com/questions/26596123/internet-explorer-9-10-11-event-constructor-doesnt-work/
				 */
				if ( typeof window.CustomEvent !== 'function' ) {
					newEvent = document.createEvent( 'CustomEvent' );
					newEvent.initCustomEvent(
						originalEvent.type,
						originalEvent.bubbles,
						originalEvent.cancelable,
						originalEvent.detail
					);
				} else {
					newEvent = new originalEvent.constructor( originalEvent.type, originalEvent );
				}

				completedEvents[ newEvent.timeStamp ] = true;

				originalEvent.target.dispatchEvent( newEvent );
			}

			bumpStat( stat ).then( dispatchOriginalEvent, dispatchOriginalEvent );
		}
	}

	function actionBarEscapeHtml(string) {
		return String(string).replace(/[&<>"'\/]/g, function (s) {
			var entityMap = {
				"&": "&amp;",
				"<": "&lt;",
				">": "&gt;",
				'"': '&quot;',
				"'": '&#39;',
				"/": '&#x2F;'
			};
			return entityMap[s];
		});
	}

	function showActionBarStatusMessage( message ) {
		$( '#actionbar .actnbr-actn-follow' ).replaceWith( '<a class="actnbr-action actnbr-actn-following" href="">' + followingbtn + '<span>' + fbd.i18n.following + '</span></a>' );
		$( '#actionbar .actnbr-follow-bubble' ).html( ' \
			<ul> \
				<li class="actnbr-sitename"><a href="' + fbd.siteURL + '">' + fbd.icon + ' ' + actionBarEscapeHtml( fbd.siteName ) + '</a></li> \
				<li class="actnbr-message">' + message + '</li> \
			</ul> \
		');

		var btn = $( '#actionbar .actnbr-btn' );
		btn.removeClass( 'actnbr-hidden' );

		setTimeout( function() {
			if ( ! btn.hasClass( 'actnbr-hidden' ) ) {
				$( '#actionbar .actnbr-email-field' ).focus();
				$( document ).on( 'click.actnbr-body-click', function(e) {
					if ( $( e.target ).closest( '.actnbr-popover' )[0] ) {
						return;
					}
					btn.addClass( 'actnbr-hidden' );
					$( document ).off( 'click.actnbr-body-click' );
				} );
			}
		}, 10 );
	}

	function showActionBarFollowForm() {
		var btn = $( '#actionbar .actnbr-btn' );
		btn.toggleClass( 'actnbr-hidden' );

		var form = $('<form>');

		if ( fbd.i18n.followers ) {
			form.append( $( '<div class="actnbr-follow-count">' ).html( fbd.i18n.followers ) );
		}

		form.append($('<div>').append($('<input>').attr({"type": "email", "name": "email", "placeholder": fbd.i18n.enterEmail, "class": "actnbr-email-field"})));
		form.append($('<input type="hidden" name="action" value="subscribe"/>'));
		form.append($('<input type="hidden" name="blog_id">').attr('value', fbd.siteID));
		form.append($('<input type="hidden" name="source">').attr('value', fbd.referer));
		form.append($('<input type="hidden" name="sub-type" value="actionbar-follow"/>'));
		form.append($(fbd.subscribeNonce));
		form.append($('<div class="actnbr-button-wrap">').append($('<button type="submit">').attr('value', fbd.i18n.subscribe).html(fbd.i18n.subscribe)));
		form.attr('method', 'post');
		form.attr('action', 'https://subscribe.wordpress.com');
		form.attr('accept-charset', 'utf-8');

		var html = $('<ul/>');
		html.append($('<li class="actnbr-sitename">').append($('<a>').attr('href', fbd.siteURL).append($(fbd.icon)).append(' ' + actionBarEscapeHtml( fbd.siteName ))))
		html.append($('<li>').append(form));
		html.append($('<li class="actnbr-login-nudge">').append($('<div>').html(fbd.i18n.alreadyUser)));

		$( '#actionbar .actnbr-follow-bubble' ).empty().append(html);

		setTimeout( function() {
			if ( ! btn.hasClass( 'actnbr-hidden' ) ) {
				bumpStat( 'show_follow_form' );

				$( '#actionbar .actnbr-email-field' ).focus();

				$( document ).on( 'click.actnbr-body-click', function( event ) {
					if ( $( event.target ).closest( '.actnbr-popover' )[ 0 ] ) {
						return;
					}

					btn.addClass( 'actnbr-hidden' );

					$( document ).off( 'click.actnbr-body-click' );
				} );
			}
		}, 10 );
	}
})(jQuery);
;
/*!
 * MediaElement.js
 * http://www.mediaelementjs.com/
 *
 * Wrapper that mimics native HTML5 MediaElement (audio and video)
 * using a variety of technologies (pure JavaScript, Flash, iframe)
 *
 * Copyright 2010-2017, John Dyer (http://j.hn/)
 * License: MIT
 *
 */
!function e(t,n,o){function i(a,s){if(!n[a]){if(!t[a]){var l="function"==typeof require&&require;if(!s&&l)return l(a,!0);if(r)return r(a,!0);var d=new Error("Cannot find module '"+a+"'");throw d.code="MODULE_NOT_FOUND",d}var u=n[a]={exports:{}};t[a][0].call(u.exports,function(e){var n=t[a][1][e];return i(n||e)},u,u.exports,e,t,n,o)}return n[a].exports}for(var r="function"==typeof require&&require,a=0;a<o.length;a++)i(o[a]);return i}({1:[function(e,t,n){},{}],2:[function(e,t,n){(function(n){var o,i=void 0!==n?n:"undefined"!=typeof window?window:{},r=e(1);"undefined"!=typeof document?o=document:(o=i["__GLOBAL_DOCUMENT_CACHE@4"])||(o=i["__GLOBAL_DOCUMENT_CACHE@4"]=r),t.exports=o}).call(this,"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{1:1}],3:[function(e,t,n){(function(e){var n;n="undefined"!=typeof window?window:void 0!==e?e:"undefined"!=typeof self?self:{},t.exports=n}).call(this,"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{}],4:[function(e,t,n){!function(e){function n(){}function o(e,t){return function(){e.apply(t,arguments)}}function i(e){if("object"!=typeof this)throw new TypeError("Promises must be constructed via new");if("function"!=typeof e)throw new TypeError("not a function");this._state=0,this._handled=!1,this._value=void 0,this._deferreds=[],u(e,this)}function r(e,t){for(;3===e._state;)e=e._value;0!==e._state?(e._handled=!0,i._immediateFn(function(){var n=1===e._state?t.onFulfilled:t.onRejected;if(null!==n){var o;try{o=n(e._value)}catch(e){return void s(t.promise,e)}a(t.promise,o)}else(1===e._state?a:s)(t.promise,e._value)})):e._deferreds.push(t)}function a(e,t){try{if(t===e)throw new TypeError("A promise cannot be resolved with itself.");if(t&&("object"==typeof t||"function"==typeof t)){var n=t.then;if(t instanceof i)return e._state=3,e._value=t,void l(e);if("function"==typeof n)return void u(o(n,t),e)}e._state=1,e._value=t,l(e)}catch(t){s(e,t)}}function s(e,t){e._state=2,e._value=t,l(e)}function l(e){2===e._state&&0===e._deferreds.length&&i._immediateFn(function(){e._handled||i._unhandledRejectionFn(e._value)});for(var t=0,n=e._deferreds.length;t<n;t++)r(e,e._deferreds[t]);e._deferreds=null}function d(e,t,n){this.onFulfilled="function"==typeof e?e:null,this.onRejected="function"==typeof t?t:null,this.promise=n}function u(e,t){var n=!1;try{e(function(e){n||(n=!0,a(t,e))},function(e){n||(n=!0,s(t,e))})}catch(e){if(n)return;n=!0,s(t,e)}}var c=setTimeout;i.prototype.catch=function(e){return this.then(null,e)},i.prototype.then=function(e,t){var o=new this.constructor(n);return r(this,new d(e,t,o)),o},i.all=function(e){var t=Array.prototype.slice.call(e);return new i(function(e,n){function o(r,a){try{if(a&&("object"==typeof a||"function"==typeof a)){var s=a.then;if("function"==typeof s)return void s.call(a,function(e){o(r,e)},n)}t[r]=a,0==--i&&e(t)}catch(e){n(e)}}if(0===t.length)return e([]);for(var i=t.length,r=0;r<t.length;r++)o(r,t[r])})},i.resolve=function(e){return e&&"object"==typeof e&&e.constructor===i?e:new i(function(t){t(e)})},i.reject=function(e){return new i(function(t,n){n(e)})},i.race=function(e){return new i(function(t,n){for(var o=0,i=e.length;o<i;o++)e[o].then(t,n)})},i._immediateFn="function"==typeof setImmediate&&function(e){setImmediate(e)}||function(e){c(e,0)},i._unhandledRejectionFn=function(e){"undefined"!=typeof console&&console&&console.warn("Possible Unhandled Promise Rejection:",e)},i._setImmediateFn=function(e){i._immediateFn=e},i._setUnhandledRejectionFn=function(e){i._unhandledRejectionFn=e},void 0!==t&&t.exports?t.exports=i:e.Promise||(e.Promise=i)}(this)},{}],5:[function(e,t,n){"use strict";Object.defineProperty(n,"__esModule",{value:!0});var o="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e},i=function(e){return e&&e.__esModule?e:{default:e}}(e(7)),r=e(15),a=e(27),s={lang:"en",en:r.EN};s.language=function(){for(var e=arguments.length,t=Array(e),n=0;n<e;n++)t[n]=arguments[n];if(null!==t&&void 0!==t&&t.length){if("string"!=typeof t[0])throw new TypeError("Language code must be a string value");if(!/^[a-z]{2,3}((\-|_)[a-z]{2})?$/i.test(t[0]))throw new TypeError("Language code must have format 2-3 letters and. optionally, hyphen, underscore followed by 2 more letters");s.lang=t[0],void 0===s[t[0]]?(t[1]=null!==t[1]&&void 0!==t[1]&&"object"===o(t[1])?t[1]:{},s[t[0]]=(0,a.isObjectEmpty)(t[1])?r.EN:t[1]):null!==t[1]&&void 0!==t[1]&&"object"===o(t[1])&&(s[t[0]]=t[1])}return s.lang},s.t=function(e){var t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:null;if("string"==typeof e&&e.length){var n=void 0,i=void 0,r=s.language(),l=function(e,t,n){return"object"!==(void 0===e?"undefined":o(e))||"number"!=typeof t||"number"!=typeof n?e:[function(){return arguments.length<=1?void 0:arguments[1]},function(){return 1===(arguments.length<=0?void 0:arguments[0])?arguments.length<=1?void 0:arguments[1]:arguments.length<=2?void 0:arguments[2]},function(){return 0===(arguments.length<=0?void 0:arguments[0])||1===(arguments.length<=0?void 0:arguments[0])?arguments.length<=1?void 0:arguments[1]:arguments.length<=2?void 0:arguments[2]},function(){return(arguments.length<=0?void 0:arguments[0])%10==1&&(arguments.length<=0?void 0:arguments[0])%100!=11?arguments.length<=1?void 0:arguments[1]:0!==(arguments.length<=0?void 0:arguments[0])?arguments.length<=2?void 0:arguments[2]:arguments.length<=3?void 0:arguments[3]},function(){return 1===(arguments.length<=0?void 0:arguments[0])||11===(arguments.length<=0?void 0:arguments[0])?arguments.length<=1?void 0:arguments[1]:2===(arguments.length<=0?void 0:arguments[0])||12===(arguments.length<=0?void 0:arguments[0])?arguments.length<=2?void 0:arguments[2]:(arguments.length<=0?void 0:arguments[0])>2&&(arguments.length<=0?void 0:arguments[0])<20?arguments.length<=3?void 0:arguments[3]:arguments.length<=4?void 0:arguments[4]},function(){return 1===(arguments.length<=0?void 0:arguments[0])?arguments.length<=1?void 0:arguments[1]:0===(arguments.length<=0?void 0:arguments[0])||(arguments.length<=0?void 0:arguments[0])%100>0&&(arguments.length<=0?void 0:arguments[0])%100<20?arguments.length<=2?void 0:arguments[2]:arguments.length<=3?void 0:arguments[3]},function(){return(arguments.length<=0?void 0:arguments[0])%10==1&&(arguments.length<=0?void 0:arguments[0])%100!=11?arguments.length<=1?void 0:arguments[1]:(arguments.length<=0?void 0:arguments[0])%10>=2&&((arguments.length<=0?void 0:arguments[0])%100<10||(arguments.length<=0?void 0:arguments[0])%100>=20)?arguments.length<=2?void 0:arguments[2]:[3]},function(){return(arguments.length<=0?void 0:arguments[0])%10==1&&(arguments.length<=0?void 0:arguments[0])%100!=11?arguments.length<=1?void 0:arguments[1]:(arguments.length<=0?void 0:arguments[0])%10>=2&&(arguments.length<=0?void 0:arguments[0])%10<=4&&((arguments.length<=0?void 0:arguments[0])%100<10||(arguments.length<=0?void 0:arguments[0])%100>=20)?arguments.length<=2?void 0:arguments[2]:arguments.length<=3?void 0:arguments[3]},function(){return 1===(arguments.length<=0?void 0:arguments[0])?arguments.length<=1?void 0:arguments[1]:(arguments.length<=0?void 0:arguments[0])>=2&&(arguments.length<=0?void 0:arguments[0])<=4?arguments.length<=2?void 0:arguments[2]:arguments.length<=3?void 0:arguments[3]},function(){return 1===(arguments.length<=0?void 0:arguments[0])?arguments.length<=1?void 0:arguments[1]:(arguments.length<=0?void 0:arguments[0])%10>=2&&(arguments.length<=0?void 0:arguments[0])%10<=4&&((arguments.length<=0?void 0:arguments[0])%100<10||(arguments.length<=0?void 0:arguments[0])%100>=20)?arguments.length<=2?void 0:arguments[2]:arguments.length<=3?void 0:arguments[3]},function(){return(arguments.length<=0?void 0:arguments[0])%100==1?arguments.length<=2?void 0:arguments[2]:(arguments.length<=0?void 0:arguments[0])%100==2?arguments.length<=3?void 0:arguments[3]:(arguments.length<=0?void 0:arguments[0])%100==3||(arguments.length<=0?void 0:arguments[0])%100==4?arguments.length<=4?void 0:arguments[4]:arguments.length<=1?void 0:arguments[1]},function(){return 1===(arguments.length<=0?void 0:arguments[0])?arguments.length<=1?void 0:arguments[1]:2===(arguments.length<=0?void 0:arguments[0])?arguments.length<=2?void 0:arguments[2]:(arguments.length<=0?void 0:arguments[0])>2&&(arguments.length<=0?void 0:arguments[0])<7?arguments.length<=3?void 0:arguments[3]:(arguments.length<=0?void 0:arguments[0])>6&&(arguments.length<=0?void 0:arguments[0])<11?arguments.length<=4?void 0:arguments[4]:arguments.length<=5?void 0:arguments[5]},function(){return 0===(arguments.length<=0?void 0:arguments[0])?arguments.length<=1?void 0:arguments[1]:1===(arguments.length<=0?void 0:arguments[0])?arguments.length<=2?void 0:arguments[2]:2===(arguments.length<=0?void 0:arguments[0])?arguments.length<=3?void 0:arguments[3]:(arguments.length<=0?void 0:arguments[0])%100>=3&&(arguments.length<=0?void 0:arguments[0])%100<=10?arguments.length<=4?void 0:arguments[4]:(arguments.length<=0?void 0:arguments[0])%100>=11?arguments.length<=5?void 0:arguments[5]:arguments.length<=6?void 0:arguments[6]},function(){return 1===(arguments.length<=0?void 0:arguments[0])?arguments.length<=1?void 0:arguments[1]:0===(arguments.length<=0?void 0:arguments[0])||(arguments.length<=0?void 0:arguments[0])%100>1&&(arguments.length<=0?void 0:arguments[0])%100<11?arguments.length<=2?void 0:arguments[2]:(arguments.length<=0?void 0:arguments[0])%100>10&&(arguments.length<=0?void 0:arguments[0])%100<20?arguments.length<=3?void 0:arguments[3]:arguments.length<=4?void 0:arguments[4]},function(){return(arguments.length<=0?void 0:arguments[0])%10==1?arguments.length<=1?void 0:arguments[1]:(arguments.length<=0?void 0:arguments[0])%10==2?arguments.length<=2?void 0:arguments[2]:arguments.length<=3?void 0:arguments[3]},function(){return 11!==(arguments.length<=0?void 0:arguments[0])&&(arguments.length<=0?void 0:arguments[0])%10==1?arguments.length<=1?void 0:arguments[1]:arguments.length<=2?void 0:arguments[2]},function(){return 1===(arguments.length<=0?void 0:arguments[0])?arguments.length<=1?void 0:arguments[1]:(arguments.length<=0?void 0:arguments[0])%10>=2&&(arguments.length<=0?void 0:arguments[0])%10<=4&&((arguments.length<=0?void 0:arguments[0])%100<10||(arguments.length<=0?void 0:arguments[0])%100>=20)?arguments.length<=2?void 0:arguments[2]:arguments.length<=3?void 0:arguments[3]},function(){return 1===(arguments.length<=0?void 0:arguments[0])?arguments.length<=1?void 0:arguments[1]:2===(arguments.length<=0?void 0:arguments[0])?arguments.length<=2?void 0:arguments[2]:8!==(arguments.length<=0?void 0:arguments[0])&&11!==(arguments.length<=0?void 0:arguments[0])?arguments.length<=3?void 0:arguments[3]:arguments.length<=4?void 0:arguments[4]},function(){return 0===(arguments.length<=0?void 0:arguments[0])?arguments.length<=1?void 0:arguments[1]:arguments.length<=2?void 0:arguments[2]},function(){return 1===(arguments.length<=0?void 0:arguments[0])?arguments.length<=1?void 0:arguments[1]:2===(arguments.length<=0?void 0:arguments[0])?arguments.length<=2?void 0:arguments[2]:3===(arguments.length<=0?void 0:arguments[0])?arguments.length<=3?void 0:arguments[3]:arguments.length<=4?void 0:arguments[4]},function(){return 0===(arguments.length<=0?void 0:arguments[0])?arguments.length<=1?void 0:arguments[1]:1===(arguments.length<=0?void 0:arguments[0])?arguments.length<=2?void 0:arguments[2]:arguments.length<=3?void 0:arguments[3]}][n].apply(null,[t].concat(e))};return void 0!==s[r]&&(n=s[r][e],null!==t&&"number"==typeof t&&(i=s[r]["mejs.plural-form"],n=l.apply(null,[n,t,i]))),!n&&s.en&&(n=s.en[e],null!==t&&"number"==typeof t&&(i=s.en["mejs.plural-form"],n=l.apply(null,[n,t,i]))),n=n||e,null!==t&&"number"==typeof t&&(n=n.replace("%1",t)),(0,a.escapeHTML)(n)}return e},i.default.i18n=s,"undefined"!=typeof mejsL10n&&i.default.i18n.language(mejsL10n.language,mejsL10n.strings),n.default=s},{15:15,27:27,7:7}],6:[function(e,t,n){"use strict";function o(e){return e&&e.__esModule?e:{default:e}}function i(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}Object.defineProperty(n,"__esModule",{value:!0});var r="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e},a=o(e(3)),s=o(e(2)),l=o(e(7)),d=e(27),u=e(28),c=e(8),f=e(25),p=function e(t,n,o){var p=this;i(this,e);var m=this;o=Array.isArray(o)?o:null,m.defaults={renderers:[],fakeNodeName:"mediaelementwrapper",pluginPath:"build/",shimScriptAccess:"sameDomain"},n=Object.assign(m.defaults,n),m.mediaElement=s.default.createElement(n.fakeNodeName);var h=t,v=!1;if("string"==typeof t?m.mediaElement.originalNode=s.default.getElementById(t):(m.mediaElement.originalNode=t,h=t.id),void 0===m.mediaElement.originalNode||null===m.mediaElement.originalNode)return null;m.mediaElement.options=n,h=h||"mejs_"+Math.random().toString().slice(2),m.mediaElement.originalNode.setAttribute("id",h+"_from_mejs");var g=m.mediaElement.originalNode.tagName.toLowerCase();["video","audio"].indexOf(g)>-1&&!m.mediaElement.originalNode.getAttribute("preload")&&m.mediaElement.originalNode.setAttribute("preload","none"),m.mediaElement.originalNode.parentNode.insertBefore(m.mediaElement,m.mediaElement.originalNode),m.mediaElement.appendChild(m.mediaElement.originalNode);var y=function(e,t){if("https:"===a.default.location.protocol&&0===e.indexOf("http:")&&f.IS_IOS&&l.default.html5media.mediaTypes.indexOf(t)>-1){var n=new XMLHttpRequest;n.onreadystatechange=function(){if(4===this.readyState&&200===this.status){var t=(a.default.URL||a.default.webkitURL).createObjectURL(this.response);return m.mediaElement.originalNode.setAttribute("src",t),t}return e},n.open("GET",e),n.responseType="blob",n.send()}return e},E=void 0;if(null!==o)E=o;else if(null!==m.mediaElement.originalNode)switch(E=[],m.mediaElement.originalNode.nodeName.toLowerCase()){case"iframe":E.push({type:"",src:m.mediaElement.originalNode.getAttribute("src")});break;case"audio":case"video":var b=m.mediaElement.originalNode.children.length,S=m.mediaElement.originalNode.getAttribute("src");if(S){var x=m.mediaElement.originalNode,w=(0,u.formatType)(S,x.getAttribute("type"));E.push({type:w,src:y(S,w)})}for(var P=0;P<b;P++){var T=m.mediaElement.originalNode.children[P];if("source"===T.tagName.toLowerCase()){var C=T.getAttribute("src"),k=(0,u.formatType)(C,T.getAttribute("type"));E.push({type:k,src:y(C,k)})}}}m.mediaElement.id=h,m.mediaElement.renderers={},m.mediaElement.events={},m.mediaElement.promises=[],m.mediaElement.renderer=null,m.mediaElement.rendererName=null,m.mediaElement.changeRenderer=function(e,t){var n=p,o=Object.keys(t[0]).length>2?t[0]:t[0].src;if(void 0!==n.mediaElement.renderer&&null!==n.mediaElement.renderer&&n.mediaElement.renderer.name===e)return n.mediaElement.renderer.pause(),n.mediaElement.renderer.stop&&n.mediaElement.renderer.stop(),n.mediaElement.renderer.show(),n.mediaElement.renderer.setSrc(o),!0;void 0!==n.mediaElement.renderer&&null!==n.mediaElement.renderer&&(n.mediaElement.renderer.pause(),n.mediaElement.renderer.stop&&n.mediaElement.renderer.stop(),n.mediaElement.renderer.hide());var i=n.mediaElement.renderers[e],r=null;if(void 0!==i&&null!==i)return i.show(),i.setSrc(o),n.mediaElement.renderer=i,n.mediaElement.rendererName=e,!0;for(var a=n.mediaElement.options.renderers.length?n.mediaElement.options.renderers:c.renderer.order,s=0,l=a.length;s<l;s++){var d=a[s];if(d===e){r=c.renderer.renderers[d];var u=Object.assign(r.options,n.mediaElement.options);return i=r.create(n.mediaElement,u,t),i.name=e,n.mediaElement.renderers[r.name]=i,n.mediaElement.renderer=i,n.mediaElement.rendererName=e,i.show(),!0}}return!1},m.mediaElement.setSize=function(e,t){void 0!==m.mediaElement.renderer&&null!==m.mediaElement.renderer&&m.mediaElement.renderer.setSize(e,t)},m.mediaElement.generateError=function(e,t){e=e||"",t=Array.isArray(t)?t:[];var n=(0,d.createEvent)("error",m.mediaElement);n.message=e,n.urls=t,m.mediaElement.dispatchEvent(n),v=!0};var _=l.default.html5media.properties,N=l.default.html5media.methods,A=function(e,t,n,o){var i=e[t];Object.defineProperty(e,t,{get:function(){return n.apply(e,[i])},set:function(t){return i=o.apply(e,[t])}})},L=function(){return void 0!==m.mediaElement.renderer&&null!==m.mediaElement.renderer?m.mediaElement.renderer.getSrc():null},F=function(e){var t=[];if("string"==typeof e)t.push({src:e,type:e?(0,u.getTypeFromFile)(e):""});else if("object"===(void 0===e?"undefined":r(e))&&void 0!==e.src){var n=(0,u.absolutizeUrl)(e.src),o=e.type,i=Object.assign(e,{src:n,type:""!==o&&null!==o&&void 0!==o||!n?o:(0,u.getTypeFromFile)(n)});t.push(i)}else if(Array.isArray(e))for(var a=0,s=e.length;a<s;a++){var l=(0,u.absolutizeUrl)(e[a].src),f=e[a].type,p=Object.assign(e[a],{src:l,type:""!==f&&null!==f&&void 0!==f||!l?f:(0,u.getTypeFromFile)(l)});t.push(p)}var h=c.renderer.select(t,m.mediaElement.options.renderers.length?m.mediaElement.options.renderers:[]),v=void 0;if(m.mediaElement.paused||(m.mediaElement.pause(),v=(0,d.createEvent)("pause",m.mediaElement),m.mediaElement.dispatchEvent(v)),m.mediaElement.originalNode.src=t[0].src||"",null!==h||!t[0].src)return t[0].src?m.mediaElement.changeRenderer(h.rendererName,t):null;m.mediaElement.generateError("No renderer found",t)},j=function(e,t){try{if("play"===e&&"native_dash"===m.mediaElement.rendererName){var n=m.mediaElement.renderer[e](t);n&&"function"==typeof n.then&&n.catch(function(){m.mediaElement.paused&&setTimeout(function(){var e=m.mediaElement.renderer.play();void 0!==e&&e.catch(function(){m.mediaElement.renderer.paused||m.mediaElement.renderer.pause()})},150)})}else m.mediaElement.renderer[e](t)}catch(e){m.mediaElement.generateError(e,E)}};A(m.mediaElement,"src",L,F),m.mediaElement.getSrc=L,m.mediaElement.setSrc=F;for(var I=0,M=_.length;I<M;I++)!function(e){if("src"!==e){var t=""+e.substring(0,1).toUpperCase()+e.substring(1),n=function(){return void 0!==m.mediaElement.renderer&&null!==m.mediaElement.renderer&&"function"==typeof m.mediaElement.renderer["get"+t]?m.mediaElement.renderer["get"+t]():null},o=function(e){void 0!==m.mediaElement.renderer&&null!==m.mediaElement.renderer&&"function"==typeof m.mediaElement.renderer["set"+t]&&m.mediaElement.renderer["set"+t](e)};A(m.mediaElement,e,n,o),m.mediaElement["get"+t]=n,m.mediaElement["set"+t]=o}}(_[I]);for(var O=0,D=N.length;O<D;O++)!function(e){m.mediaElement[e]=function(){for(var t=arguments.length,n=Array(t),o=0;o<t;o++)n[o]=arguments[o];return void 0!==m.mediaElement.renderer&&null!==m.mediaElement.renderer&&"function"==typeof m.mediaElement.renderer[e]&&(m.mediaElement.promises.length?Promise.all(m.mediaElement.promises).then(function(){j(e,n)}).catch(function(e){m.mediaElement.generateError(e,E)}):j(e,n)),null}}(N[O]);return m.mediaElement.addEventListener=function(e,t){m.mediaElement.events[e]=m.mediaElement.events[e]||[],m.mediaElement.events[e].push(t)},m.mediaElement.removeEventListener=function(e,t){if(!e)return m.mediaElement.events={},!0;var n=m.mediaElement.events[e];if(!n)return!0;if(!t)return m.mediaElement.events[e]=[],!0;for(var o=0;o<n.length;o++)if(n[o]===t)return m.mediaElement.events[e].splice(o,1),!0;return!1},m.mediaElement.dispatchEvent=function(e){var t=m.mediaElement.events[e.type];if(t)for(var n=0;n<t.length;n++)t[n].apply(null,[e])},E.length&&(m.mediaElement.src=E),m.mediaElement.promises.length?Promise.all(m.mediaElement.promises).then(function(){m.mediaElement.options.success&&m.mediaElement.options.success(m.mediaElement,m.mediaElement.originalNode)}).catch(function(){v&&m.mediaElement.options.error&&m.mediaElement.options.error(m.mediaElement,m.mediaElement.originalNode)}):(m.mediaElement.options.success&&m.mediaElement.options.success(m.mediaElement,m.mediaElement.originalNode),v&&m.mediaElement.options.error&&m.mediaElement.options.error(m.mediaElement,m.mediaElement.originalNode)),m.mediaElement};a.default.MediaElement=p,l.default.MediaElement=p,n.default=p},{2:2,25:25,27:27,28:28,3:3,7:7,8:8}],7:[function(e,t,n){"use strict";Object.defineProperty(n,"__esModule",{value:!0});var o=function(e){return e&&e.__esModule?e:{default:e}}(e(3)),i={};i.version="4.2.6",i.html5media={properties:["volume","src","currentTime","muted","duration","paused","ended","buffered","error","networkState","readyState","seeking","seekable","currentSrc","preload","bufferedBytes","bufferedTime","initialTime","startOffsetTime","defaultPlaybackRate","playbackRate","played","autoplay","loop","controls"],readOnlyProperties:["duration","paused","ended","buffered","error","networkState","readyState","seeking","seekable"],methods:["load","play","pause","canPlayType"],events:["loadstart","durationchange","loadedmetadata","loadeddata","progress","canplay","canplaythrough","suspend","abort","error","emptied","stalled","play","playing","pause","waiting","seeking","seeked","timeupdate","ended","ratechange","volumechange"],mediaTypes:["audio/mp3","audio/ogg","audio/oga","audio/wav","audio/x-wav","audio/wave","audio/x-pn-wav","audio/mpeg","audio/mp4","video/mp4","video/webm","video/ogg","video/ogv"]},o.default.mejs=i,n.default=i},{3:3}],8:[function(e,t,n){"use strict";function o(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}Object.defineProperty(n,"__esModule",{value:!0}),n.renderer=void 0;var i="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e},r=function(){function e(e,t){for(var n=0;n<t.length;n++){var o=t[n];o.enumerable=o.enumerable||!1,o.configurable=!0,"value"in o&&(o.writable=!0),Object.defineProperty(e,o.key,o)}}return function(t,n,o){return n&&e(t.prototype,n),o&&e(t,o),t}}(),a=function(e){return e&&e.__esModule?e:{default:e}}(e(7)),s=function(){function e(){o(this,e),this.renderers={},this.order=[]}return r(e,[{key:"add",value:function(e){if(void 0===e.name)throw new TypeError("renderer must contain at least `name` property");this.renderers[e.name]=e,this.order.push(e.name)}},{key:"select",value:function(e){var t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:[],n=t.length;if(t=t.length?t:this.order,!n){var o=[/^(html5|native)/i,/^flash/i,/iframe$/i],i=function(e){for(var t=0,n=o.length;t<n;t++)if(o[t].test(e))return t;return o.length};t.sort(function(e,t){return i(e)-i(t)})}for(var r=0,a=t.length;r<a;r++){var s=t[r],l=this.renderers[s];if(null!==l&&void 0!==l)for(var d=0,u=e.length;d<u;d++)if("function"==typeof l.canPlayType&&"string"==typeof e[d].type&&l.canPlayType(e[d].type))return{rendererName:l.name,src:e[d].src}}return null}},{key:"order",set:function(e){if(!Array.isArray(e))throw new TypeError("order must be an array of strings.");this._order=e},get:function(){return this._order}},{key:"renderers",set:function(e){if(null!==e&&"object"!==(void 0===e?"undefined":i(e)))throw new TypeError("renderers must be an array of objects.");this._renderers=e},get:function(){return this._renderers}}]),e}(),l=n.renderer=new s;a.default.Renderers=l},{7:7}],9:[function(e,t,n){"use strict";function o(e){return e&&e.__esModule?e:{default:e}}var i=o(e(3)),r=o(e(2)),a=o(e(5)),s=e(16),l=o(s),d=function(e){if(e&&e.__esModule)return e;var t={};if(null!=e)for(var n in e)Object.prototype.hasOwnProperty.call(e,n)&&(t[n]=e[n]);return t.default=e,t}(e(25)),u=e(27),c=e(26),f=e(28);Object.assign(s.config,{usePluginFullScreen:!0,fullscreenText:null,useFakeFullscreen:!1}),Object.assign(l.default.prototype,{isFullScreen:!1,isNativeFullScreen:!1,isInIframe:!1,isPluginClickThroughCreated:!1,fullscreenMode:"",containerSizeTimeout:null,buildfullscreen:function(e){if(e.isVideo){e.isInIframe=i.default.location!==i.default.parent.location,e.detectFullscreenMode();var t=this,n=(0,u.isString)(t.options.fullscreenText)?t.options.fullscreenText:a.default.t("mejs.fullscreen"),o=r.default.createElement("div");if(o.className=t.options.classPrefix+"button "+t.options.classPrefix+"fullscreen-button",o.innerHTML='<button type="button" aria-controls="'+t.id+'" title="'+n+'" aria-label="'+n+'" tabindex="0"></button>',t.addControlElement(o,"fullscreen"),o.addEventListener("click",function(){d.HAS_TRUE_NATIVE_FULLSCREEN&&d.IS_FULLSCREEN||e.isFullScreen?e.exitFullScreen():e.enterFullScreen()}),e.fullscreenBtn=o,t.options.keyActions.push({keys:[70],action:function(e,t,n,o){o.ctrlKey||void 0!==e.enterFullScreen&&(e.isFullScreen?e.exitFullScreen():e.enterFullScreen())}}),t.exitFullscreenCallback=function(n){27===(n.which||n.keyCode||0)&&(d.HAS_TRUE_NATIVE_FULLSCREEN&&d.IS_FULLSCREEN||t.isFullScreen)&&e.exitFullScreen()},t.globalBind("keydown",t.exitFullscreenCallback),t.normalHeight=0,t.normalWidth=0,d.HAS_TRUE_NATIVE_FULLSCREEN){e.globalBind(d.FULLSCREEN_EVENT_NAME,function(){e.isFullScreen&&(d.isFullScreen()?(e.isNativeFullScreen=!0,e.setControlsSize()):(e.isNativeFullScreen=!1,e.exitFullScreen()))})}}},cleanfullscreen:function(e){e.exitFullScreen(),e.globalUnbind("keydown",e.exitFullscreenCallback)},detectFullscreenMode:function(){var e=this,t=null!==e.media.rendererName&&/(native|html5)/i.test(e.media.rendererName),n="";return d.HAS_TRUE_NATIVE_FULLSCREEN&&t?n="native-native":d.HAS_TRUE_NATIVE_FULLSCREEN&&!t?n="plugin-native":e.usePluginFullScreen&&d.SUPPORT_POINTER_EVENTS&&(n="plugin-click"),e.fullscreenMode=n,n},enterFullScreen:function(){var e=this,t=null!==e.media.rendererName&&/(html5|native)/i.test(e.media.rendererName),n=getComputedStyle(e.getElement(e.container));if(!1===e.options.useFakeFullscreen&&d.IS_IOS&&d.HAS_IOS_FULLSCREEN&&"function"==typeof e.media.originalNode.webkitEnterFullscreen&&e.media.originalNode.canPlayType((0,f.getTypeFromFile)(e.media.getSrc())))e.media.originalNode.webkitEnterFullscreen();else{if((0,c.addClass)(r.default.documentElement,e.options.classPrefix+"fullscreen"),(0,c.addClass)(e.getElement(e.container),e.options.classPrefix+"container-fullscreen"),e.normalHeight=parseFloat(n.height),e.normalWidth=parseFloat(n.width),"native-native"!==e.fullscreenMode&&"plugin-native"!==e.fullscreenMode||(d.requestFullScreen(e.getElement(e.container)),e.isInIframe&&setTimeout(function t(){if(e.isNativeFullScreen){var n=i.default.innerWidth||r.default.documentElement.clientWidth||r.default.body.clientWidth,o=screen.width;Math.abs(o-n)>.002*o?e.exitFullScreen():setTimeout(t,500)}},1e3)),e.getElement(e.container).style.width="100%",e.getElement(e.container).style.height="100%",e.containerSizeTimeout=setTimeout(function(){e.getElement(e.container).style.width="100%",e.getElement(e.container).style.height="100%",e.setControlsSize()},500),t)e.node.style.width="100%",e.node.style.height="100%";else for(var o=e.getElement(e.container).querySelectorAll("embed, object, video"),a=o.length,s=0;s<a;s++)o[s].style.width="100%",o[s].style.height="100%";e.options.setDimensions&&"function"==typeof e.media.setSize&&e.media.setSize(screen.width,screen.height);for(var l=e.getElement(e.layers).children,p=l.length,m=0;m<p;m++)l[m].style.width="100%",l[m].style.height="100%";e.fullscreenBtn&&((0,c.removeClass)(e.fullscreenBtn,e.options.classPrefix+"fullscreen"),(0,c.addClass)(e.fullscreenBtn,e.options.classPrefix+"unfullscreen")),e.setControlsSize(),e.isFullScreen=!0;var h=Math.min(screen.width/e.width,screen.height/e.height),v=e.getElement(e.container).querySelector("."+e.options.classPrefix+"captions-text");v&&(v.style.fontSize=100*h+"%",v.style.lineHeight="normal",e.getElement(e.container).querySelector("."+e.options.classPrefix+"captions-position").style.bottom="45px");var g=(0,u.createEvent)("enteredfullscreen",e.getElement(e.container));e.getElement(e.container).dispatchEvent(g)}},exitFullScreen:function(){var e=this,t=null!==e.media.rendererName&&/(native|html5)/i.test(e.media.rendererName);if(clearTimeout(e.containerSizeTimeout),d.HAS_TRUE_NATIVE_FULLSCREEN&&(d.IS_FULLSCREEN||e.isFullScreen)&&d.cancelFullScreen(),(0,c.removeClass)(r.default.documentElement,e.options.classPrefix+"fullscreen"),(0,c.removeClass)(e.getElement(e.container),e.options.classPrefix+"container-fullscreen"),e.options.setDimensions){if(e.getElement(e.container).style.width=e.normalWidth+"px",e.getElement(e.container).style.height=e.normalHeight+"px",t)e.node.style.width=e.normalWidth+"px",e.node.style.height=e.normalHeight+"px";else for(var n=e.getElement(e.container).querySelectorAll("embed, object, video"),o=n.length,i=0;i<o;i++)n[i].style.width=e.normalWidth+"px",n[i].style.height=e.normalHeight+"px";"function"==typeof e.media.setSize&&e.media.setSize(e.normalWidth,e.normalHeight);for(var a=e.getElement(e.layers).children,s=a.length,l=0;l<s;l++)a[l].style.width=e.normalWidth+"px",a[l].style.height=e.normalHeight+"px"}e.fullscreenBtn&&((0,c.removeClass)(e.fullscreenBtn,e.options.classPrefix+"unfullscreen"),(0,c.addClass)(e.fullscreenBtn,e.options.classPrefix+"fullscreen")),e.setControlsSize(),e.isFullScreen=!1;var f=e.getElement(e.container).querySelector("."+e.options.classPrefix+"captions-text");f&&(f.style.fontSize="",f.style.lineHeight="",e.getElement(e.container).querySelector("."+e.options.classPrefix+"captions-position").style.bottom="");var p=(0,u.createEvent)("exitedfullscreen",e.getElement(e.container));e.getElement(e.container).dispatchEvent(p)}})},{16:16,2:2,25:25,26:26,27:27,28:28,3:3,5:5}],10:[function(e,t,n){"use strict";function o(e){return e&&e.__esModule?e:{default:e}}var i=o(e(2)),r=e(16),a=o(r),s=o(e(5)),l=e(27),d=e(26);Object.assign(r.config,{playText:null,pauseText:null}),Object.assign(a.default.prototype,{buildplaypause:function(e,t,n,o){function r(e){"play"===e?((0,d.removeClass)(p,a.options.classPrefix+"play"),(0,d.removeClass)(p,a.options.classPrefix+"replay"),(0,d.addClass)(p,a.options.classPrefix+"pause"),m.setAttribute("title",f),m.setAttribute("aria-label",f)):((0,d.removeClass)(p,a.options.classPrefix+"pause"),(0,d.removeClass)(p,a.options.classPrefix+"replay"),(0,d.addClass)(p,a.options.classPrefix+"play"),m.setAttribute("title",c),m.setAttribute("aria-label",c))}var a=this,u=a.options,c=(0,l.isString)(u.playText)?u.playText:s.default.t("mejs.play"),f=(0,l.isString)(u.pauseText)?u.pauseText:s.default.t("mejs.pause"),p=i.default.createElement("div");p.className=a.options.classPrefix+"button "+a.options.classPrefix+"playpause-button "+a.options.classPrefix+"play",p.innerHTML='<button type="button" aria-controls="'+a.id+'" title="'+c+'" aria-label="'+f+'" tabindex="0"></button>',p.addEventListener("click",function(){a.paused?a.play():a.pause()});var m=p.querySelector("button");a.addControlElement(p,"playpause"),r("pse"),o.addEventListener("loadedmetadata",function(){-1===o.rendererName.indexOf("flash")&&r("pse")}),o.addEventListener("play",function(){r("play")}),o.addEventListener("playing",function(){r("play")}),o.addEventListener("pause",function(){r("pse")}),o.addEventListener("ended",function(){e.options.loop||((0,d.removeClass)(p,a.options.classPrefix+"pause"),(0,d.removeClass)(p,a.options.classPrefix+"play"),(0,d.addClass)(p,a.options.classPrefix+"replay"),m.setAttribute("title",c),m.setAttribute("aria-label",c))})}})},{16:16,2:2,26:26,27:27,5:5}],11:[function(e,t,n){"use strict";function o(e){return e&&e.__esModule?e:{default:e}}var i=o(e(2)),r=e(16),a=o(r),s=o(e(5)),l=e(25),d=e(30),u=e(26);Object.assign(r.config,{enableProgressTooltip:!0,useSmoothHover:!0,forceLive:!1}),Object.assign(a.default.prototype,{buildprogress:function(e,t,n,o){var a=0,c=!1,f=!1,p=this,m=e.options.autoRewind,h=e.options.enableProgressTooltip?'<span class="'+p.options.classPrefix+'time-float"><span class="'+p.options.classPrefix+'time-float-current">00:00</span><span class="'+p.options.classPrefix+'time-float-corner"></span></span>':"",v=i.default.createElement("div");v.className=p.options.classPrefix+"time-rail",v.innerHTML='<span class="'+p.options.classPrefix+"time-total "+p.options.classPrefix+'time-slider"><span class="'+p.options.classPrefix+'time-buffering"></span><span class="'+p.options.classPrefix+'time-loaded"></span><span class="'+p.options.classPrefix+'time-current"></span><span class="'+p.options.classPrefix+'time-hovered no-hover"></span><span class="'+p.options.classPrefix+'time-handle"><span class="'+p.options.classPrefix+'time-handle-content"></span></span>'+h+"</span>",p.addControlElement(v,"progress"),p.options.keyActions.push({keys:[37,227],action:function(e){if(!isNaN(e.duration)&&e.duration>0){e.isVideo&&(e.showControls(),e.startControlsTimer()),e.getElement(e.container).querySelector("."+r.config.classPrefix+"time-total").focus();var t=Math.max(e.currentTime-e.options.defaultSeekBackwardInterval(e),0);e.setCurrentTime(t)}}},{keys:[39,228],action:function(e){if(!isNaN(e.duration)&&e.duration>0){e.isVideo&&(e.showControls(),e.startControlsTimer()),e.getElement(e.container).querySelector("."+r.config.classPrefix+"time-total").focus();var t=Math.min(e.currentTime+e.options.defaultSeekForwardInterval(e),e.duration);e.setCurrentTime(t)}}}),p.rail=t.querySelector("."+p.options.classPrefix+"time-rail"),p.total=t.querySelector("."+p.options.classPrefix+"time-total"),p.loaded=t.querySelector("."+p.options.classPrefix+"time-loaded"),p.current=t.querySelector("."+p.options.classPrefix+"time-current"),p.handle=t.querySelector("."+p.options.classPrefix+"time-handle"),p.timefloat=t.querySelector("."+p.options.classPrefix+"time-float"),p.timefloatcurrent=t.querySelector("."+p.options.classPrefix+"time-float-current"),p.slider=t.querySelector("."+p.options.classPrefix+"time-slider"),p.hovered=t.querySelector("."+p.options.classPrefix+"time-hovered"),p.buffer=t.querySelector("."+p.options.classPrefix+"time-buffering"),p.newTime=0,p.forcedHandlePause=!1,p.setTransformStyle=function(e,t){e.style.transform=t,e.style.webkitTransform=t,e.style.MozTransform=t,e.style.msTransform=t,e.style.OTransform=t},p.buffer.style.display="none";var g=function(t){var n=getComputedStyle(p.total),o=(0,u.offset)(p.total),i=p.total.offsetWidth,r=void 0!==n.webkitTransform?"webkitTransform":void 0!==n.mozTransform?"mozTransform ":void 0!==n.oTransform?"oTransform":void 0!==n.msTransform?"msTransform":"transform",a="WebKitCSSMatrix"in window?"WebKitCSSMatrix":"MSCSSMatrix"in window?"MSCSSMatrix":"CSSMatrix"in window?"CSSMatrix":void 0,s=0,f=0,m=0,h=void 0;if(h=t.originalEvent&&t.originalEvent.changedTouches?t.originalEvent.changedTouches[0].pageX:t.changedTouches?t.changedTouches[0].pageX:t.pageX,p.getDuration()){if(h<o.left?h=o.left:h>i+o.left&&(h=i+o.left),m=h-o.left,s=m/i,p.newTime=s<=.02?0:s*p.getDuration(),c&&null!==p.getCurrentTime()&&p.newTime.toFixed(4)!==p.getCurrentTime().toFixed(4)&&(p.setCurrentRailHandle(p.newTime),p.updateCurrent(p.newTime)),!l.IS_IOS&&!l.IS_ANDROID){if(m<0&&(m=0),p.options.useSmoothHover&&null!==a&&void 0!==window[a]){var v=new window[a](getComputedStyle(p.handle)[r]).m41,g=m/parseFloat(getComputedStyle(p.total).width)-v/parseFloat(getComputedStyle(p.total).width);p.hovered.style.left=v+"px",p.setTransformStyle(p.hovered,"scaleX("+g+")"),p.hovered.setAttribute("pos",m),g>=0?(0,u.removeClass)(p.hovered,"negative"):(0,u.addClass)(p.hovered,"negative")}if(p.timefloat){var y=p.timefloat.offsetWidth/2,E=mejs.Utils.offset(p.getElement(p.container)),b=getComputedStyle(p.timefloat);f=h-E.left<p.timefloat.offsetWidth?y:h-E.left>=p.getElement(p.container).offsetWidth-y?p.total.offsetWidth-y:m,(0,u.hasClass)(p.getElement(p.container),p.options.classPrefix+"long-video")&&(f+=parseFloat(b.marginLeft)/2+p.timefloat.offsetWidth/2),p.timefloat.style.left=f+"px",p.timefloatcurrent.innerHTML=(0,d.secondsToTimeCode)(p.newTime,e.options.alwaysShowHours,e.options.showTimecodeFrameCount,e.options.framesPerSecond,e.options.secondsDecimalLength,e.options.timeFormat),p.timefloat.style.display="block"}}}else l.IS_IOS||l.IS_ANDROID||!p.timefloat||(f=p.timefloat.offsetWidth+i>=p.getElement(p.container).offsetWidth?p.timefloat.offsetWidth/2:0,p.timefloat.style.left=f+"px",p.timefloat.style.left=f+"px",p.timefloat.style.display="block")},y=function(){var t=p.getCurrentTime(),n=s.default.t("mejs.time-slider"),i=(0,d.secondsToTimeCode)(t,e.options.alwaysShowHours,e.options.showTimecodeFrameCount,e.options.framesPerSecond,e.options.secondsDecimalLength,e.options.timeFormat),r=p.getDuration();p.slider.setAttribute("role","slider"),p.slider.tabIndex=0,o.paused?(p.slider.setAttribute("aria-label",n),p.slider.setAttribute("aria-valuemin",0),p.slider.setAttribute("aria-valuemax",r),p.slider.setAttribute("aria-valuenow",t),p.slider.setAttribute("aria-valuetext",i)):(p.slider.removeAttribute("aria-label"),p.slider.removeAttribute("aria-valuemin"),p.slider.removeAttribute("aria-valuemax"),p.slider.removeAttribute("aria-valuenow"),p.slider.removeAttribute("aria-valuetext"))},E=function(){new Date-a>=1e3&&p.play()},b=function(){c&&null!==p.getCurrentTime()&&p.newTime.toFixed(4)!==p.getCurrentTime().toFixed(4)&&(p.setCurrentTime(p.newTime),p.setCurrentRail(),p.updateCurrent(p.newTime)),p.forcedHandlePause&&(p.slider.focus(),p.play()),p.forcedHandlePause=!1};p.slider.addEventListener("focus",function(){e.options.autoRewind=!1}),p.slider.addEventListener("blur",function(){e.options.autoRewind=m}),p.slider.addEventListener("keydown",function(t){if(new Date-a>=1e3&&(f=p.paused),p.options.keyActions.length){var n=t.which||t.keyCode||0,i=p.getDuration(),r=e.options.defaultSeekForwardInterval(o),s=e.options.defaultSeekBackwardInterval(o),d=p.getCurrentTime(),u=p.getElement(p.container).querySelector("."+p.options.classPrefix+"volume-slider");if(38===n||40===n){u&&(u.style.display="block"),p.isVideo&&(p.showControls(),p.startControlsTimer());var c=38===n?Math.min(p.volume+.1,1):Math.max(p.volume-.1,0),m=c<=0;return p.setVolume(c),void p.setMuted(m)}switch(u&&(u.style.display="none"),n){case 37:p.getDuration()!==1/0&&(d-=s);break;case 39:p.getDuration()!==1/0&&(d+=r);break;case 36:d=0;break;case 35:d=i;break;case 13:case 32:return void(l.IS_FIREFOX&&(p.paused?p.play():p.pause()));default:return}d=d<0?0:d>=i?i:Math.floor(d),a=new Date,f||e.pause(),d<p.getDuration()&&!f&&setTimeout(E,1100),p.setCurrentTime(d),e.showControls(),t.preventDefault(),t.stopPropagation()}});var S=["mousedown","touchstart"];p.slider.addEventListener("dragstart",function(){return!1});for(var x=0,w=S.length;x<w;x++)p.slider.addEventListener(S[x],function(e){if(p.forcedHandlePause=!1,p.getDuration()!==1/0&&(1===e.which||0===e.which)){p.paused||(p.pause(),p.forcedHandlePause=!0),c=!0,g(e);for(var t=["mouseup","touchend"],n=0,o=t.length;n<o;n++)p.getElement(p.container).addEventListener(t[n],function(e){var t=e.target;(t===p.slider||t.closest("."+p.options.classPrefix+"time-slider"))&&g(e)});p.globalBind("mouseup.dur touchend.dur",function(){b(),c=!1,p.timefloat&&(p.timefloat.style.display="none")})}},!(!l.SUPPORT_PASSIVE_EVENT||"touchstart"!==S[x])&&{passive:!0});p.slider.addEventListener("mouseenter",function(e){e.target===p.slider&&p.getDuration()!==1/0&&(p.getElement(p.container).addEventListener("mousemove",function(e){var t=e.target;(t===p.slider||t.closest("."+p.options.classPrefix+"time-slider"))&&g(e)}),!p.timefloat||l.IS_IOS||l.IS_ANDROID||(p.timefloat.style.display="block"),p.hovered&&!l.IS_IOS&&!l.IS_ANDROID&&p.options.useSmoothHover&&(0,u.removeClass)(p.hovered,"no-hover"))}),p.slider.addEventListener("mouseleave",function(){p.getDuration()!==1/0&&(c||(p.timefloat&&(p.timefloat.style.display="none"),p.hovered&&p.options.useSmoothHover&&(0,u.addClass)(p.hovered,"no-hover")))}),p.broadcastCallback=function(n){var o=t.querySelector("."+p.options.classPrefix+"broadcast");if(p.options.forceLive||p.getDuration()===1/0){if(!o||p.options.forceLive){var r=i.default.createElement("span");r.className=p.options.classPrefix+"broadcast",r.innerText=s.default.t("mejs.live-broadcast"),p.slider.style.display="none",p.rail.appendChild(r)}}else o&&(p.slider.style.display="",o.remove()),e.setProgressRail(n),p.forcedHandlePause||e.setCurrentRail(n),y()},o.addEventListener("progress",p.broadcastCallback),o.addEventListener("timeupdate",p.broadcastCallback),o.addEventListener("play",function(){p.buffer.style.display="none"}),o.addEventListener("playing",function(){p.buffer.style.display="none"}),o.addEventListener("seeking",function(){p.buffer.style.display=""}),o.addEventListener("seeked",function(){p.buffer.style.display="none"}),o.addEventListener("pause",function(){p.buffer.style.display="none"}),o.addEventListener("waiting",function(){p.buffer.style.display=""}),o.addEventListener("loadeddata",function(){p.buffer.style.display=""}),o.addEventListener("canplay",function(){p.buffer.style.display="none"}),o.addEventListener("error",function(){p.buffer.style.display="none"}),p.getElement(p.container).addEventListener("controlsresize",function(t){p.getDuration()!==1/0&&(e.setProgressRail(t),p.forcedHandlePause||e.setCurrentRail(t))})},cleanprogress:function(e,t,n,o){o.removeEventListener("progress",e.broadcastCallback),o.removeEventListener("timeupdate",e.broadcastCallback),e.rail&&e.rail.remove()},setProgressRail:function(e){var t=this,n=void 0!==e?e.detail.target||e.target:t.media,o=null;n&&n.buffered&&n.buffered.length>0&&n.buffered.end&&t.getDuration()?o=n.buffered.end(n.buffered.length-1)/t.getDuration():n&&void 0!==n.bytesTotal&&n.bytesTotal>0&&void 0!==n.bufferedBytes?o=n.bufferedBytes/n.bytesTotal:e&&e.lengthComputable&&0!==e.total&&(o=e.loaded/e.total),null!==o&&(o=Math.min(1,Math.max(0,o)),t.loaded&&t.setTransformStyle(t.loaded,"scaleX("+o+")"))},setCurrentRailHandle:function(e){var t=this;t.setCurrentRailMain(t,e)},setCurrentRail:function(){var e=this;e.setCurrentRailMain(e)},setCurrentRailMain:function(e,t){if(void 0!==e.getCurrentTime()&&e.getDuration()){var n=void 0===t?e.getCurrentTime():t;if(e.total&&e.handle){var o=parseFloat(getComputedStyle(e.total).width),i=Math.round(o*n/e.getDuration()),r=i-Math.round(e.handle.offsetWidth/2);if(r=r<0?0:r,e.setTransformStyle(e.current,"scaleX("+i/o+")"),e.setTransformStyle(e.handle,"translateX("+r+"px)"),e.options.useSmoothHover&&!(0,u.hasClass)(e.hovered,"no-hover")){var a=parseInt(e.hovered.getAttribute("pos"),10),s=(a=isNaN(a)?0:a)/o-r/o;e.hovered.style.left=r+"px",e.setTransformStyle(e.hovered,"scaleX("+s+")"),s>=0?(0,u.removeClass)(e.hovered,"negative"):(0,u.addClass)(e.hovered,"negative")}}}}})},{16:16,2:2,25:25,26:26,30:30,5:5}],12:[function(e,t,n){"use strict";function o(e){return e&&e.__esModule?e:{default:e}}var i=o(e(2)),r=e(16),a=o(r),s=e(30),l=e(26);Object.assign(r.config,{duration:0,timeAndDurationSeparator:"<span> | </span>"}),Object.assign(a.default.prototype,{buildcurrent:function(e,t,n,o){var r=this,a=i.default.createElement("div");a.className=r.options.classPrefix+"time",a.setAttribute("role","timer"),a.setAttribute("aria-live","off"),a.innerHTML='<span class="'+r.options.classPrefix+'currenttime">'+(0,s.secondsToTimeCode)(0,e.options.alwaysShowHours,e.options.showTimecodeFrameCount,e.options.framesPerSecond,e.options.secondsDecimalLength,e.options.timeFormat)+"</span>",r.addControlElement(a,"current"),e.updateCurrent(),r.updateTimeCallback=function(){r.controlsAreVisible&&e.updateCurrent()},o.addEventListener("timeupdate",r.updateTimeCallback)},cleancurrent:function(e,t,n,o){o.removeEventListener("timeupdate",e.updateTimeCallback)},buildduration:function(e,t,n,o){var r=this;if(t.lastChild.querySelector("."+r.options.classPrefix+"currenttime"))t.querySelector("."+r.options.classPrefix+"time").innerHTML+=r.options.timeAndDurationSeparator+'<span class="'+r.options.classPrefix+'duration">'+(0,s.secondsToTimeCode)(r.options.duration,r.options.alwaysShowHours,r.options.showTimecodeFrameCount,r.options.framesPerSecond,r.options.secondsDecimalLength,r.options.timeFormat)+"</span>";else{t.querySelector("."+r.options.classPrefix+"currenttime")&&(0,l.addClass)(t.querySelector("."+r.options.classPrefix+"currenttime").parentNode,r.options.classPrefix+"currenttime-container");var a=i.default.createElement("div");a.className=r.options.classPrefix+"time "+r.options.classPrefix+"duration-container",a.innerHTML='<span class="'+r.options.classPrefix+'duration">'+(0,s.secondsToTimeCode)(r.options.duration,r.options.alwaysShowHours,r.options.showTimecodeFrameCount,r.options.framesPerSecond,r.options.secondsDecimalLength,r.options.timeFormat)+"</span>",r.addControlElement(a,"duration")}r.updateDurationCallback=function(){r.controlsAreVisible&&e.updateDuration()},o.addEventListener("timeupdate",r.updateDurationCallback)},cleanduration:function(e,t,n,o){o.removeEventListener("timeupdate",e.updateDurationCallback)},updateCurrent:function(){var e=this,t=e.getCurrentTime();isNaN(t)&&(t=0);var n=(0,s.secondsToTimeCode)(t,e.options.alwaysShowHours,e.options.showTimecodeFrameCount,e.options.framesPerSecond,e.options.secondsDecimalLength,e.options.timeFormat);n.length>5?(0,l.addClass)(e.getElement(e.container),e.options.classPrefix+"long-video"):(0,l.removeClass)(e.getElement(e.container),e.options.classPrefix+"long-video"),e.getElement(e.controls).querySelector("."+e.options.classPrefix+"currenttime")&&(e.getElement(e.controls).querySelector("."+e.options.classPrefix+"currenttime").innerText=n)},updateDuration:function(){var e=this,t=e.getDuration();(isNaN(t)||t===1/0||t<0)&&(e.media.duration=e.options.duration=t=0),e.options.duration>0&&(t=e.options.duration);var n=(0,s.secondsToTimeCode)(t,e.options.alwaysShowHours,e.options.showTimecodeFrameCount,e.options.framesPerSecond,e.options.secondsDecimalLength,e.options.timeFormat);n.length>5?(0,l.addClass)(e.getElement(e.container),e.options.classPrefix+"long-video"):(0,l.removeClass)(e.getElement(e.container),e.options.classPrefix+"long-video"),e.getElement(e.controls).querySelector("."+e.options.classPrefix+"duration")&&t>0&&(e.getElement(e.controls).querySelector("."+e.options.classPrefix+"duration").innerHTML=n)}})},{16:16,2:2,26:26,30:30}],13:[function(e,t,n){"use strict";function o(e){return e&&e.__esModule?e:{default:e}}var i=o(e(2)),r=o(e(7)),a=o(e(5)),s=e(16),l=o(s),d=e(30),u=e(27),c=e(26);Object.assign(s.config,{startLanguage:"",tracksText:null,chaptersText:null,tracksAriaLive:!1,hideCaptionsButtonWhenEmpty:!0,toggleCaptionsButtonWhenOnlyOne:!1,slidesSelector:""}),Object.assign(l.default.prototype,{hasChapters:!1,buildtracks:function(e,t,n,o){if(this.findTracks(),e.tracks.length||e.trackFiles&&0!==!e.trackFiles.length){var r=this,s=r.options.tracksAriaLive?' role="log" aria-live="assertive" aria-atomic="false"':"",l=(0,u.isString)(r.options.tracksText)?r.options.tracksText:a.default.t("mejs.captions-subtitles"),d=(0,u.isString)(r.options.chaptersText)?r.options.chaptersText:a.default.t("mejs.captions-chapters"),f=null===e.trackFiles?e.tracks.length:e.trackFiles.length;if(r.domNode.textTracks)for(var p=r.domNode.textTracks.length-1;p>=0;p--)r.domNode.textTracks[p].mode="hidden";r.cleartracks(e),e.captions=i.default.createElement("div"),e.captions.className=r.options.classPrefix+"captions-layer "+r.options.classPrefix+"layer",e.captions.innerHTML='<div class="'+r.options.classPrefix+"captions-position "+r.options.classPrefix+'captions-position-hover"'+s+'><span class="'+r.options.classPrefix+'captions-text"></span></div>',e.captions.style.display="none",n.insertBefore(e.captions,n.firstChild),e.captionsText=e.captions.querySelector("."+r.options.classPrefix+"captions-text"),e.captionsButton=i.default.createElement("div"),e.captionsButton.className=r.options.classPrefix+"button "+r.options.classPrefix+"captions-button",e.captionsButton.innerHTML='<button type="button" aria-controls="'+r.id+'" title="'+l+'" aria-label="'+l+'" tabindex="0"></button><div class="'+r.options.classPrefix+"captions-selector "+r.options.classPrefix+'offscreen"><ul class="'+r.options.classPrefix+'captions-selector-list"><li class="'+r.options.classPrefix+'captions-selector-list-item"><input type="radio" class="'+r.options.classPrefix+'captions-selector-input" name="'+e.id+'_captions" id="'+e.id+'_captions_none" value="none" checked disabled><label class="'+r.options.classPrefix+"captions-selector-label "+r.options.classPrefix+'captions-selected" for="'+e.id+'_captions_none">'+a.default.t("mejs.none")+"</label></li></ul></div>",r.addControlElement(e.captionsButton,"tracks"),e.captionsButton.querySelector("."+r.options.classPrefix+"captions-selector-input").disabled=!1,e.chaptersButton=i.default.createElement("div"),e.chaptersButton.className=r.options.classPrefix+"button "+r.options.classPrefix+"chapters-button",e.chaptersButton.innerHTML='<button type="button" aria-controls="'+r.id+'" title="'+d+'" aria-label="'+d+'" tabindex="0"></button><div class="'+r.options.classPrefix+"chapters-selector "+r.options.classPrefix+'offscreen"><ul class="'+r.options.classPrefix+'chapters-selector-list"></ul></div>';for(var m=0,h=0;h<f;h++){var v=e.tracks[h].kind;e.tracks[h].src.trim()&&("subtitles"===v||"captions"===v?m++:"chapters"!==v||t.querySelector("."+r.options.classPrefix+"chapter-selector")||e.captionsButton.parentNode.insertBefore(e.chaptersButton,e.captionsButton))}e.trackToLoad=-1,e.selectedTrack=null,e.isLoadingTrack=!1;for(var g=0;g<f;g++){var y=e.tracks[g].kind;!e.tracks[g].src.trim()||"subtitles"!==y&&"captions"!==y||e.addTrackButton(e.tracks[g].trackId,e.tracks[g].srclang,e.tracks[g].label)}e.loadNextTrack();var E=["mouseenter","focusin"],b=["mouseleave","focusout"];if(r.options.toggleCaptionsButtonWhenOnlyOne&&1===m)e.captionsButton.addEventListener("click",function(t){var n="none";null===e.selectedTrack&&(n=e.tracks[0].trackId);var o=t.keyCode||t.which;e.setTrack(n,void 0!==o)});else{for(var S=e.captionsButton.querySelectorAll("."+r.options.classPrefix+"captions-selector-label"),x=e.captionsButton.querySelectorAll("input[type=radio]"),w=0,P=E.length;w<P;w++)e.captionsButton.addEventListener(E[w],function(){(0,c.removeClass)(this.querySelector("."+r.options.classPrefix+"captions-selector"),r.options.classPrefix+"offscreen")});for(var T=0,C=b.length;T<C;T++)e.captionsButton.addEventListener(b[T],function(){(0,c.addClass)(this.querySelector("."+r.options.classPrefix+"captions-selector"),r.options.classPrefix+"offscreen")});for(var k=0,_=x.length;k<_;k++)x[k].addEventListener("click",function(t){var n=t.keyCode||t.which;e.setTrack(this.value,void 0!==n)});for(var N=0,A=S.length;N<A;N++)S[N].addEventListener("click",function(e){var t=(0,c.siblings)(this,function(e){return"INPUT"===e.tagName})[0],n=(0,u.createEvent)("click",t);t.dispatchEvent(n),e.preventDefault()});e.captionsButton.addEventListener("keydown",function(e){e.stopPropagation()})}for(var L=0,F=E.length;L<F;L++)e.chaptersButton.addEventListener(E[L],function(){this.querySelector("."+r.options.classPrefix+"chapters-selector-list").children.length&&(0,c.removeClass)(this.querySelector("."+r.options.classPrefix+"chapters-selector"),r.options.classPrefix+"offscreen")});for(var j=0,I=b.length;j<I;j++)e.chaptersButton.addEventListener(b[j],function(){(0,c.addClass)(this.querySelector("."+r.options.classPrefix+"chapters-selector"),r.options.classPrefix+"offscreen")});e.chaptersButton.addEventListener("keydown",function(e){e.stopPropagation()}),e.options.alwaysShowControls?(0,c.addClass)(e.getElement(e.container).querySelector("."+r.options.classPrefix+"captions-position"),r.options.classPrefix+"captions-position-hover"):(e.getElement(e.container).addEventListener("controlsshown",function(){(0,c.addClass)(e.getElement(e.container).querySelector("."+r.options.classPrefix+"captions-position"),r.options.classPrefix+"captions-position-hover")}),e.getElement(e.container).addEventListener("controlshidden",function(){o.paused||(0,c.removeClass)(e.getElement(e.container).querySelector("."+r.options.classPrefix+"captions-position"),r.options.classPrefix+"captions-position-hover")})),o.addEventListener("timeupdate",function(){e.displayCaptions()}),""!==e.options.slidesSelector&&(e.slidesContainer=i.default.querySelectorAll(e.options.slidesSelector),o.addEventListener("timeupdate",function(){e.displaySlides()}))}},cleartracks:function(e){e&&(e.captions&&e.captions.remove(),e.chapters&&e.chapters.remove(),e.captionsText&&e.captionsText.remove(),e.captionsButton&&e.captionsButton.remove(),e.chaptersButton&&e.chaptersButton.remove())},rebuildtracks:function(){var e=this;e.findTracks(),e.buildtracks(e,e.getElement(e.controls),e.getElement(e.layers),e.media)},findTracks:function(){var e=this,t=null===e.trackFiles?e.node.querySelectorAll("track"):e.trackFiles,n=t.length;e.tracks=[];for(var o=0;o<n;o++){var i=t[o],r=i.getAttribute("srclang").toLowerCase()||"",a=e.id+"_track_"+o+"_"+i.getAttribute("kind")+"_"+r;e.tracks.push({trackId:a,srclang:r,src:i.getAttribute("src"),kind:i.getAttribute("kind"),label:i.getAttribute("label")||"",entries:[],isLoaded:!1})}},setTrack:function(e,t){for(var n=this,o=n.captionsButton.querySelectorAll('input[type="radio"]'),i=n.captionsButton.querySelectorAll("."+n.options.classPrefix+"captions-selected"),r=n.captionsButton.querySelector('input[value="'+e+'"]'),a=0,s=o.length;a<s;a++)o[a].checked=!1;for(var l=0,d=i.length;l<d;l++)(0,c.removeClass)(i[l],n.options.classPrefix+"captions-selected");r.checked=!0;for(var f=(0,c.siblings)(r,function(e){return(0,c.hasClass)(e,n.options.classPrefix+"captions-selector-label")}),p=0,m=f.length;p<m;p++)(0,c.addClass)(f[p],n.options.classPrefix+"captions-selected");if("none"===e)n.selectedTrack=null,(0,c.removeClass)(n.captionsButton,n.options.classPrefix+"captions-enabled");else for(var h=0,v=n.tracks.length;h<v;h++){var g=n.tracks[h];if(g.trackId===e){null===n.selectedTrack&&(0,c.addClass)(n.captionsButton,n.options.classPrefix+"captions-enabled"),n.selectedTrack=g,n.captions.setAttribute("lang",n.selectedTrack.srclang),n.displayCaptions();break}}var y=(0,u.createEvent)("captionschange",n.media);y.detail.caption=n.selectedTrack,n.media.dispatchEvent(y),t||setTimeout(function(){n.getElement(n.container).focus()},500)},loadNextTrack:function(){var e=this;e.trackToLoad++,e.trackToLoad<e.tracks.length?(e.isLoadingTrack=!0,e.loadTrack(e.trackToLoad)):(e.isLoadingTrack=!1,e.checkForTracks())},loadTrack:function(e){var t=this,n=t.tracks[e];void 0===n||void 0===n.src&&""===n.src||(0,c.ajax)(n.src,"text",function(e){n.entries="string"==typeof e&&/<tt\s+xml/gi.exec(e)?r.default.TrackFormatParser.dfxp.parse(e):r.default.TrackFormatParser.webvtt.parse(e),n.isLoaded=!0,t.enableTrackButton(n),t.loadNextTrack(),"slides"===n.kind?t.setupSlides(n):"chapters"!==n.kind||t.hasChapters||(t.drawChapters(n),t.hasChapters=!0)},function(){t.removeTrackButton(n.trackId),t.loadNextTrack()})},enableTrackButton:function(e){var t=this,n=e.srclang,o=i.default.getElementById(""+e.trackId);if(o){var s=e.label;""===s&&(s=a.default.t(r.default.language.codes[n])||n),o.disabled=!1;for(var l=(0,c.siblings)(o,function(e){return(0,c.hasClass)(e,t.options.classPrefix+"captions-selector-label")}),d=0,f=l.length;d<f;d++)l[d].innerHTML=s;if(t.options.startLanguage===n){o.checked=!0;var p=(0,u.createEvent)("click",o);o.dispatchEvent(p)}}},removeTrackButton:function(e){var t=i.default.getElementById(""+e);if(t){var n=t.closest("li");n&&n.remove()}},addTrackButton:function(e,t,n){var o=this;""===n&&(n=a.default.t(r.default.language.codes[t])||t),o.captionsButton.querySelector("ul").innerHTML+='<li class="'+o.options.classPrefix+'captions-selector-list-item"><input type="radio" class="'+o.options.classPrefix+'captions-selector-input" name="'+o.id+'_captions" id="'+e+'" value="'+e+'" disabled><label class="'+o.options.classPrefix+'captions-selector-label"for="'+e+'">'+n+" (loading)</label></li>"},checkForTracks:function(){var e=this,t=!1;if(e.options.hideCaptionsButtonWhenEmpty){for(var n=0,o=e.tracks.length;n<o;n++){var i=e.tracks[n].kind;if(("subtitles"===i||"captions"===i)&&e.tracks[n].isLoaded){t=!0;break}}e.captionsButton.style.display=t?"":"none",e.setControlsSize()}},displayCaptions:function(){if(void 0!==this.tracks){var e=this,t=e.selectedTrack;if(null!==t&&t.isLoaded){var n=e.searchTrackPosition(t.entries,e.media.currentTime);if(n>-1)return e.captionsText.innerHTML=function(e){var t=i.default.createElement("div");t.innerHTML=e;for(var n=t.getElementsByTagName("script"),o=n.length;o--;)n[o].remove();for(var r=t.getElementsByTagName("*"),a=0,s=r.length;a<s;a++)for(var l=r[a].attributes,d=Array.prototype.slice.call(l),u=0,c=d.length;u<c;u++)d[u].name.startsWith("on")||d[u].value.startsWith("javascript")?r[a].remove():"style"===d[u].name&&r[a].removeAttribute(d[u].name);return t.innerHTML}(t.entries[n].text),e.captionsText.className=e.options.classPrefix+"captions-text "+(t.entries[n].identifier||""),e.captions.style.display="",void(e.captions.style.height="0px");e.captions.style.display="none"}else e.captions.style.display="none"}},setupSlides:function(e){var t=this;t.slides=e,t.slides.entries.imgs=[t.slides.entries.length],t.showSlide(0)},showSlide:function(e){var t=this,n=this;if(void 0!==n.tracks&&void 0!==n.slidesContainer){var o=n.slides.entries[e].text,r=n.slides.entries[e].imgs;if(void 0===r||void 0===r.fadeIn){var a=i.default.createElement("img");a.src=o,a.addEventListener("load",function(){var e=t,o=(0,c.siblings)(e,function(e){return o(e)});e.style.display="none",n.slidesContainer.innerHTML+=e.innerHTML,(0,c.fadeIn)(n.slidesContainer.querySelector(a));for(var i=0,r=o.length;i<r;i++)(0,c.fadeOut)(o[i],400)}),n.slides.entries[e].imgs=r=a}else if(!(0,c.visible)(r)){var s=(0,c.siblings)(self,function(e){return s(e)});(0,c.fadeIn)(n.slidesContainer.querySelector(r));for(var l=0,d=s.length;l<d;l++)(0,c.fadeOut)(s[l])}}},displaySlides:function(){var e=this;if(void 0!==this.slides){var t=e.slides,n=e.searchTrackPosition(t.entries,e.media.currentTime);n>-1&&e.showSlide(n)}},drawChapters:function(e){var t=this,n=e.entries.length;if(n){t.chaptersButton.querySelector("ul").innerHTML="";for(var o=0;o<n;o++)t.chaptersButton.querySelector("ul").innerHTML+='<li class="'+t.options.classPrefix+'chapters-selector-list-item" role="menuitemcheckbox" aria-live="polite" aria-disabled="false" aria-checked="false"><input type="radio" class="'+t.options.classPrefix+'captions-selector-input" name="'+t.id+'_chapters" id="'+t.id+"_chapters_"+o+'" value="'+e.entries[o].start+'" disabled><label class="'+t.options.classPrefix+'chapters-selector-label"for="'+t.id+"_chapters_"+o+'">'+e.entries[o].text+"</label></li>";for(var i=t.chaptersButton.querySelectorAll('input[type="radio"]'),r=t.chaptersButton.querySelectorAll("."+t.options.classPrefix+"chapters-selector-label"),a=0,s=i.length;a<s;a++)i[a].disabled=!1,i[a].checked=!1,i[a].addEventListener("click",function(e){var n=this,o=t.chaptersButton.querySelectorAll("li"),i=(0,c.siblings)(n,function(e){return(0,c.hasClass)(e,t.options.classPrefix+"chapters-selector-label")})[0];n.checked=!0,n.parentNode.setAttribute("aria-checked",!0),(0,c.addClass)(i,t.options.classPrefix+"chapters-selected"),(0,c.removeClass)(t.chaptersButton.querySelector("."+t.options.classPrefix+"chapters-selected"),t.options.classPrefix+"chapters-selected");for(var r=0,a=o.length;r<a;r++)o[r].setAttribute("aria-checked",!1);void 0===(e.keyCode||e.which)&&setTimeout(function(){t.getElement(t.container).focus()},500),t.media.setCurrentTime(parseFloat(n.value)),t.media.paused&&t.media.play()});for(var l=0,d=r.length;l<d;l++)r[l].addEventListener("click",function(e){var t=(0,c.siblings)(this,function(e){return"INPUT"===e.tagName})[0],n=(0,u.createEvent)("click",t);t.dispatchEvent(n),e.preventDefault()})}},searchTrackPosition:function(e,t){for(var n=0,o=e.length-1,i=void 0,r=void 0,a=void 0;n<=o;){if(i=n+o>>1,r=e[i].start,a=e[i].stop,t>=r&&t<a)return i;r<t?n=i+1:r>t&&(o=i-1)}return-1}}),r.default.language={codes:{af:"mejs.afrikaans",sq:"mejs.albanian",ar:"mejs.arabic",be:"mejs.belarusian",bg:"mejs.bulgarian",ca:"mejs.catalan",zh:"mejs.chinese","zh-cn":"mejs.chinese-simplified","zh-tw":"mejs.chines-traditional",hr:"mejs.croatian",cs:"mejs.czech",da:"mejs.danish",nl:"mejs.dutch",en:"mejs.english",et:"mejs.estonian",fl:"mejs.filipino",fi:"mejs.finnish",fr:"mejs.french",gl:"mejs.galician",de:"mejs.german",el:"mejs.greek",ht:"mejs.haitian-creole",iw:"mejs.hebrew",hi:"mejs.hindi",hu:"mejs.hungarian",is:"mejs.icelandic",id:"mejs.indonesian",ga:"mejs.irish",it:"mejs.italian",ja:"mejs.japanese",ko:"mejs.korean",lv:"mejs.latvian",lt:"mejs.lithuanian",mk:"mejs.macedonian",ms:"mejs.malay",mt:"mejs.maltese",no:"mejs.norwegian",fa:"mejs.persian",pl:"mejs.polish",pt:"mejs.portuguese",ro:"mejs.romanian",ru:"mejs.russian",sr:"mejs.serbian",sk:"mejs.slovak",sl:"mejs.slovenian",es:"mejs.spanish",sw:"mejs.swahili",sv:"mejs.swedish",tl:"mejs.tagalog",th:"mejs.thai",tr:"mejs.turkish",uk:"mejs.ukrainian",vi:"mejs.vietnamese",cy:"mejs.welsh",yi:"mejs.yiddish"}},r.default.TrackFormatParser={webvtt:{pattern:/^((?:[0-9]{1,2}:)?[0-9]{2}:[0-9]{2}([,.][0-9]{1,3})?) --\> ((?:[0-9]{1,2}:)?[0-9]{2}:[0-9]{2}([,.][0-9]{3})?)(.*)$/,parse:function(e){for(var t=e.split(/\r?\n/),n=[],o=void 0,i=void 0,r=void 0,a=0,s=t.length;a<s;a++){if((o=this.pattern.exec(t[a]))&&a<t.length){for(a-1>=0&&""!==t[a-1]&&(r=t[a-1]),i=t[++a],a++;""!==t[a]&&a<t.length;)i=i+"\n"+t[a],a++;i=i.trim().replace(/(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gi,"<a href='$1' target='_blank'>$1</a>"),n.push({identifier:r,start:0===(0,d.convertSMPTEtoSeconds)(o[1])?.2:(0,d.convertSMPTEtoSeconds)(o[1]),stop:(0,d.convertSMPTEtoSeconds)(o[3]),text:i,settings:o[5]})}r=""}return n}},dfxp:{parse:function(e){var t=(e=$(e).filter("tt")).firstChild,n=t.querySelectorAll("p"),o=e.getElementById(""+t.attr("style")),i=[],r=void 0;if(o.length){o.removeAttribute("id");var a=o.attributes;if(a.length){r={};for(var s=0,l=a.length;s<l;s++)r[a[s].name.split(":")[1]]=a[s].value}}for(var u=0,c=n.length;u<c;u++){var f=void 0,p={start:null,stop:null,style:null,text:null};if(n.eq(u).attr("begin")&&(p.start=(0,d.convertSMPTEtoSeconds)(n.eq(u).attr("begin"))),!p.start&&n.eq(u-1).attr("end")&&(p.start=(0,d.convertSMPTEtoSeconds)(n.eq(u-1).attr("end"))),n.eq(u).attr("end")&&(p.stop=(0,d.convertSMPTEtoSeconds)(n.eq(u).attr("end"))),!p.stop&&n.eq(u+1).attr("begin")&&(p.stop=(0,d.convertSMPTEtoSeconds)(n.eq(u+1).attr("begin"))),r){f="";for(var m in r)f+=m+":"+r[m]+";"}f&&(p.style=f),0===p.start&&(p.start=.2),p.text=n.eq(u).innerHTML.trim().replace(/(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gi,"<a href='$1' target='_blank'>$1</a>"),i.push(p)}return i}}}},{16:16,2:2,26:26,27:27,30:30,5:5,7:7}],14:[function(e,t,n){"use strict";function o(e){return e&&e.__esModule?e:{default:e}}var i=o(e(2)),r=e(16),a=o(r),s=o(e(5)),l=e(25),d=e(27),u=e(26);Object.assign(r.config,{muteText:null,unmuteText:null,allyVolumeControlText:null,hideVolumeOnTouchDevices:!0,audioVolume:"horizontal",videoVolume:"vertical",startVolume:.8}),Object.assign(a.default.prototype,{buildvolume:function(e,t,n,o){if(!l.IS_ANDROID&&!l.IS_IOS||!this.options.hideVolumeOnTouchDevices){var a=this,c=a.isVideo?a.options.videoVolume:a.options.audioVolume,f=(0,d.isString)(a.options.muteText)?a.options.muteText:s.default.t("mejs.mute"),p=(0,d.isString)(a.options.unmuteText)?a.options.unmuteText:s.default.t("mejs.unmute"),m=(0,d.isString)(a.options.allyVolumeControlText)?a.options.allyVolumeControlText:s.default.t("mejs.volume-help-text"),h=i.default.createElement("div");if(h.className=a.options.classPrefix+"button "+a.options.classPrefix+"volume-button "+a.options.classPrefix+"mute",h.innerHTML="horizontal"===c?'<button type="button" aria-controls="'+a.id+'" title="'+f+'" aria-label="'+f+'" tabindex="0"></button>':'<button type="button" aria-controls="'+a.id+'" title="'+f+'" aria-label="'+f+'" tabindex="0"></button><a href="javascript:void(0);" class="'+a.options.classPrefix+'volume-slider" aria-label="'+s.default.t("mejs.volume-slider")+'" aria-valuemin="0" aria-valuemax="100" role="slider" aria-orientation="vertical"><span class="'+a.options.classPrefix+'offscreen">'+m+'</span><div class="'+a.options.classPrefix+'volume-total"><div class="'+a.options.classPrefix+'volume-current"></div><div class="'+a.options.classPrefix+'volume-handle"></div></div></a>',a.addControlElement(h,"volume"),a.options.keyActions.push({keys:[38],action:function(e){var t=e.getElement(e.container).querySelector("."+r.config.classPrefix+"volume-slider");(t||e.getElement(e.container).querySelector("."+r.config.classPrefix+"volume-slider").matches(":focus"))&&(t.style.display="block"),e.isVideo&&(e.showControls(),e.startControlsTimer());var n=Math.min(e.volume+.1,1);e.setVolume(n),n>0&&e.setMuted(!1)}},{keys:[40],action:function(e){var t=e.getElement(e.container).querySelector("."+r.config.classPrefix+"volume-slider");t&&(t.style.display="block"),e.isVideo&&(e.showControls(),e.startControlsTimer());var n=Math.max(e.volume-.1,0);e.setVolume(n),n<=.1&&e.setMuted(!0)}},{keys:[77],action:function(e){e.getElement(e.container).querySelector("."+r.config.classPrefix+"volume-slider").style.display="block",e.isVideo&&(e.showControls(),e.startControlsTimer()),e.media.muted?e.setMuted(!1):e.setMuted(!0)}}),"horizontal"===c){var v=i.default.createElement("a");v.className=a.options.classPrefix+"horizontal-volume-slider",v.href="javascript:void(0);",v.setAttribute("aria-label",s.default.t("mejs.volume-slider")),v.setAttribute("aria-valuemin",0),v.setAttribute("aria-valuemax",100),v.setAttribute("role","slider"),v.innerHTML+='<span class="'+a.options.classPrefix+'offscreen">'+m+'</span><div class="'+a.options.classPrefix+'horizontal-volume-total"><div class="'+a.options.classPrefix+'horizontal-volume-current"></div><div class="'+a.options.classPrefix+'horizontal-volume-handle"></div></div>',h.parentNode.insertBefore(v,h.nextSibling)}var g=!1,y=!1,E=!1,b=function(){var e=Math.floor(100*o.volume);S.setAttribute("aria-valuenow",e),S.setAttribute("aria-valuetext",e+"%")},S="vertical"===c?a.getElement(a.container).querySelector("."+a.options.classPrefix+"volume-slider"):a.getElement(a.container).querySelector("."+a.options.classPrefix+"horizontal-volume-slider"),x="vertical"===c?a.getElement(a.container).querySelector("."+a.options.classPrefix+"volume-total"):a.getElement(a.container).querySelector("."+a.options.classPrefix+"horizontal-volume-total"),w="vertical"===c?a.getElement(a.container).querySelector("."+a.options.classPrefix+"volume-current"):a.getElement(a.container).querySelector("."+a.options.classPrefix+"horizontal-volume-current"),P="vertical"===c?a.getElement(a.container).querySelector("."+a.options.classPrefix+"volume-handle"):a.getElement(a.container).querySelector("."+a.options.classPrefix+"horizontal-volume-handle"),T=function(e){if(null!==e&&!isNaN(e)&&void 0!==e){if(e=Math.max(0,e),0===(e=Math.min(e,1))){(0,u.removeClass)(h,a.options.classPrefix+"mute"),(0,u.addClass)(h,a.options.classPrefix+"unmute");var t=h.firstElementChild;t.setAttribute("title",p),t.setAttribute("aria-label",p)}else{(0,u.removeClass)(h,a.options.classPrefix+"unmute"),(0,u.addClass)(h,a.options.classPrefix+"mute");var n=h.firstElementChild;n.setAttribute("title",f),n.setAttribute("aria-label",f)}var o=100*e+"%",i=getComputedStyle(P);"vertical"===c?(w.style.bottom=0,w.style.height=o,P.style.bottom=o,P.style.marginBottom=-parseFloat(i.height)/2+"px"):(w.style.left=0,w.style.width=o,P.style.left=o,P.style.marginLeft=-parseFloat(i.width)/2+"px")}},C=function(e){var t=(0,u.offset)(x),n=getComputedStyle(x);E=!0;var o=null;if("vertical"===c){var i=parseFloat(n.height);if(o=(i-(e.pageY-t.top))/i,0===t.top||0===t.left)return}else{var r=parseFloat(n.width);o=(e.pageX-t.left)/r}o=Math.max(0,o),o=Math.min(o,1),T(o),a.setMuted(0===o),a.setVolume(o),e.preventDefault(),e.stopPropagation()},k=function(){a.muted?(T(0),(0,u.removeClass)(h,a.options.classPrefix+"mute"),(0,u.addClass)(h,a.options.classPrefix+"unmute")):(T(o.volume),(0,u.removeClass)(h,a.options.classPrefix+"unmute"),(0,u.addClass)(h,a.options.classPrefix+"mute"))};e.getElement(e.container).addEventListener("keydown",function(e){!!e.target.closest("."+a.options.classPrefix+"container")||"vertical"!==c||(S.style.display="none")}),h.addEventListener("mouseenter",function(e){e.target===h&&(S.style.display="block",y=!0,e.preventDefault(),e.stopPropagation())}),h.addEventListener("focusin",function(){S.style.display="block",y=!0}),h.addEventListener("focusout",function(e){e.relatedTarget&&(!e.relatedTarget||e.relatedTarget.matches("."+a.options.classPrefix+"volume-slider"))||"vertical"!==c||(S.style.display="none")}),h.addEventListener("mouseleave",function(){y=!1,g||"vertical"!==c||(S.style.display="none")}),h.addEventListener("focusout",function(){y=!1}),h.addEventListener("keydown",function(e){if(a.options.keyActions.length){var t=e.which||e.keyCode||0,n=o.volume;switch(t){case 38:n=Math.min(n+.1,1);break;case 40:n=Math.max(0,n-.1);break;default:return!0}g=!1,T(n),o.setVolume(n),e.preventDefault(),e.stopPropagation()}}),h.querySelector("button").addEventListener("click",function(){o.setMuted(!o.muted);var e=(0,d.createEvent)("volumechange",o);o.dispatchEvent(e)}),S.addEventListener("dragstart",function(){return!1}),S.addEventListener("mouseover",function(){y=!0}),S.addEventListener("focusin",function(){S.style.display="block",y=!0}),S.addEventListener("focusout",function(){y=!1,g||"vertical"!==c||(S.style.display="none")}),S.addEventListener("mousedown",function(e){C(e),a.globalBind("mousemove.vol",function(e){var t=e.target;g&&(t===S||t.closest("vertical"===c?"."+a.options.classPrefix+"volume-slider":"."+a.options.classPrefix+"horizontal-volume-slider"))&&C(e)}),a.globalBind("mouseup.vol",function(){g=!1,y||"vertical"!==c||(S.style.display="none")}),g=!0,e.preventDefault(),e.stopPropagation()}),o.addEventListener("volumechange",function(e){g||k(),b()});var _=!1;o.addEventListener("rendererready",function(){E||setTimeout(function(){_=!0,(0===e.options.startVolume||o.originalNode.muted)&&(o.setMuted(!0),e.options.startVolume=0),o.setVolume(e.options.startVolume),a.setControlsSize()},250)}),o.addEventListener("loadedmetadata",function(){setTimeout(function(){E||_||((0===e.options.startVolume||o.originalNode.muted)&&(o.setMuted(!0),e.options.startVolume=0),o.setVolume(e.options.startVolume),a.setControlsSize()),_=!1},250)}),(0===e.options.startVolume||o.originalNode.muted)&&(o.setMuted(!0),e.options.startVolume=0,k()),a.getElement(a.container).addEventListener("controlsresize",function(){k()})}}})},{16:16,2:2,25:25,26:26,27:27,5:5}],15:[function(e,t,n){"use strict";Object.defineProperty(n,"__esModule",{value:!0});n.EN={"mejs.plural-form":1,"mejs.download-file":"Download File","mejs.install-flash":"You are using a browser that does not have Flash player enabled or installed. Please turn on your Flash player plugin or download the latest version from https://get.adobe.com/flashplayer/","mejs.fullscreen":"Fullscreen","mejs.play":"Play","mejs.pause":"Pause","mejs.time-slider":"Time Slider","mejs.time-help-text":"Use Left/Right Arrow keys to advance one second, Up/Down arrows to advance ten seconds.","mejs.live-broadcast":"Live Broadcast","mejs.volume-help-text":"Use Up/Down Arrow keys to increase or decrease volume.","mejs.unmute":"Unmute","mejs.mute":"Mute","mejs.volume-slider":"Volume Slider","mejs.video-player":"Video Player","mejs.audio-player":"Audio Player","mejs.captions-subtitles":"Captions/Subtitles","mejs.captions-chapters":"Chapters","mejs.none":"None","mejs.afrikaans":"Afrikaans","mejs.albanian":"Albanian","mejs.arabic":"Arabic","mejs.belarusian":"Belarusian","mejs.bulgarian":"Bulgarian","mejs.catalan":"Catalan","mejs.chinese":"Chinese","mejs.chinese-simplified":"Chinese (Simplified)","mejs.chinese-traditional":"Chinese (Traditional)","mejs.croatian":"Croatian","mejs.czech":"Czech","mejs.danish":"Danish","mejs.dutch":"Dutch","mejs.english":"English","mejs.estonian":"Estonian","mejs.filipino":"Filipino","mejs.finnish":"Finnish","mejs.french":"French","mejs.galician":"Galician","mejs.german":"German","mejs.greek":"Greek","mejs.haitian-creole":"Haitian Creole","mejs.hebrew":"Hebrew","mejs.hindi":"Hindi","mejs.hungarian":"Hungarian","mejs.icelandic":"Icelandic","mejs.indonesian":"Indonesian","mejs.irish":"Irish","mejs.italian":"Italian","mejs.japanese":"Japanese","mejs.korean":"Korean","mejs.latvian":"Latvian","mejs.lithuanian":"Lithuanian","mejs.macedonian":"Macedonian","mejs.malay":"Malay","mejs.maltese":"Maltese","mejs.norwegian":"Norwegian","mejs.persian":"Persian","mejs.polish":"Polish","mejs.portuguese":"Portuguese","mejs.romanian":"Romanian","mejs.russian":"Russian","mejs.serbian":"Serbian","mejs.slovak":"Slovak","mejs.slovenian":"Slovenian","mejs.spanish":"Spanish","mejs.swahili":"Swahili","mejs.swedish":"Swedish","mejs.tagalog":"Tagalog","mejs.thai":"Thai","mejs.turkish":"Turkish","mejs.ukrainian":"Ukrainian","mejs.vietnamese":"Vietnamese","mejs.welsh":"Welsh","mejs.yiddish":"Yiddish"}},{}],16:[function(e,t,n){"use strict";function o(e){return e&&e.__esModule?e:{default:e}}function i(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}Object.defineProperty(n,"__esModule",{value:!0}),n.config=void 0;var r="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e},a=function(){function e(e,t){for(var n=0;n<t.length;n++){var o=t[n];o.enumerable=o.enumerable||!1,o.configurable=!0,"value"in o&&(o.writable=!0),Object.defineProperty(e,o.key,o)}}return function(t,n,o){return n&&e(t.prototype,n),o&&e(t,o),t}}(),s=o(e(3)),l=o(e(2)),d=o(e(7)),u=o(e(6)),c=o(e(17)),f=o(e(5)),p=e(25),m=e(27),h=e(30),v=e(28),g=function(e){if(e&&e.__esModule)return e;var t={};if(null!=e)for(var n in e)Object.prototype.hasOwnProperty.call(e,n)&&(t[n]=e[n]);return t.default=e,t}(e(26));d.default.mepIndex=0,d.default.players={};var y=n.config={poster:"",showPosterWhenEnded:!1,showPosterWhenPaused:!1,defaultVideoWidth:480,defaultVideoHeight:270,videoWidth:-1,videoHeight:-1,defaultAudioWidth:400,defaultAudioHeight:40,defaultSeekBackwardInterval:function(e){return.05*e.getDuration()},defaultSeekForwardInterval:function(e){return.05*e.getDuration()},setDimensions:!0,audioWidth:-1,audioHeight:-1,loop:!1,autoRewind:!0,enableAutosize:!0,timeFormat:"",alwaysShowHours:!1,showTimecodeFrameCount:!1,framesPerSecond:25,alwaysShowControls:!1,hideVideoControlsOnLoad:!1,hideVideoControlsOnPause:!1,clickToPlayPause:!0,controlsTimeoutDefault:1500,controlsTimeoutMouseEnter:2500,controlsTimeoutMouseLeave:1e3,iPadUseNativeControls:!1,iPhoneUseNativeControls:!1,AndroidUseNativeControls:!1,features:["playpause","current","progress","duration","tracks","volume","fullscreen"],useDefaultControls:!1,isVideo:!0,stretching:"auto",classPrefix:"mejs__",enableKeyboard:!0,pauseOtherPlayers:!0,secondsDecimalLength:0,customError:null,keyActions:[{keys:[32,179],action:function(e){p.IS_FIREFOX||(e.paused||e.ended?e.play():e.pause())}}]};d.default.MepDefaults=y;var E=function(){function e(t,n){i(this,e);var o=this,r="string"==typeof t?l.default.getElementById(t):t;if(!(o instanceof e))return new e(r,n);if(o.node=o.media=r,o.node){if(o.media.player)return o.media.player;if(o.hasFocus=!1,o.controlsAreVisible=!0,o.controlsEnabled=!0,o.controlsTimer=null,o.currentMediaTime=0,o.proxy=null,void 0===n){var a=o.node.getAttribute("data-mejsoptions");n=a?JSON.parse(a):{}}return o.options=Object.assign({},y,n),o.options.loop&&!o.media.getAttribute("loop")?(o.media.loop=!0,o.node.loop=!0):o.media.loop&&(o.options.loop=!0),o.options.timeFormat||(o.options.timeFormat="mm:ss",o.options.alwaysShowHours&&(o.options.timeFormat="hh:mm:ss"),o.options.showTimecodeFrameCount&&(o.options.timeFormat+=":ff")),(0,h.calculateTimeFormat)(0,o.options,o.options.framesPerSecond||25),o.id="mep_"+d.default.mepIndex++,d.default.players[o.id]=o,o.init(),o}}return a(e,[{key:"getElement",value:function(e){return e}},{key:"init",value:function(){var e=this,t=Object.assign({},e.options,{success:function(t,n){e._meReady(t,n)},error:function(t){e._handleError(t)}}),n=e.node.tagName.toLowerCase();if(e.isDynamic="audio"!==n&&"video"!==n&&"iframe"!==n,e.isVideo=e.isDynamic?e.options.isVideo:"audio"!==n&&e.options.isVideo,e.mediaFiles=null,e.trackFiles=null,p.IS_IPAD&&e.options.iPadUseNativeControls||p.IS_IPHONE&&e.options.iPhoneUseNativeControls)e.node.setAttribute("controls",!0),p.IS_IPAD&&e.node.getAttribute("autoplay")&&e.play();else if(!e.isVideo&&(e.isVideo||!e.options.features.length&&!e.options.useDefaultControls)||p.IS_ANDROID&&e.options.AndroidUseNativeControls)e.isVideo||e.options.features.length||e.options.useDefaultControls||(e.node.style.display="none");else{e.node.removeAttribute("controls");var o=e.isVideo?f.default.t("mejs.video-player"):f.default.t("mejs.audio-player"),i=l.default.createElement("span");if(i.className=e.options.classPrefix+"offscreen",i.innerText=o,e.media.parentNode.insertBefore(i,e.media),e.container=l.default.createElement("div"),e.getElement(e.container).id=e.id,e.getElement(e.container).className=e.options.classPrefix+"container "+e.options.classPrefix+"container-keyboard-inactive "+e.media.className,e.getElement(e.container).tabIndex=0,e.getElement(e.container).setAttribute("role","application"),e.getElement(e.container).setAttribute("aria-label",o),e.getElement(e.container).innerHTML='<div class="'+e.options.classPrefix+'inner"><div class="'+e.options.classPrefix+'mediaelement"></div><div class="'+e.options.classPrefix+'layers"></div><div class="'+e.options.classPrefix+'controls"></div></div>',e.getElement(e.container).addEventListener("focus",function(t){if(!e.controlsAreVisible&&!e.hasFocus&&e.controlsEnabled){e.showControls(!0);var n=(0,m.isNodeAfter)(t.relatedTarget,e.getElement(e.container))?"."+e.options.classPrefix+"controls ."+e.options.classPrefix+"button:last-child > button":"."+e.options.classPrefix+"playpause-button > button";e.getElement(e.container).querySelector(n).focus()}}),e.node.parentNode.insertBefore(e.getElement(e.container),e.node),e.options.features.length||e.options.useDefaultControls||(e.getElement(e.container).style.background="transparent",e.getElement(e.container).querySelector("."+e.options.classPrefix+"controls").style.display="none"),e.isVideo&&"fill"===e.options.stretching&&!g.hasClass(e.getElement(e.container).parentNode,e.options.classPrefix+"fill-container")){e.outerContainer=e.media.parentNode;var r=l.default.createElement("div");r.className=e.options.classPrefix+"fill-container",e.getElement(e.container).parentNode.insertBefore(r,e.getElement(e.container)),r.appendChild(e.getElement(e.container))}if(p.IS_ANDROID&&g.addClass(e.getElement(e.container),e.options.classPrefix+"android"),p.IS_IOS&&g.addClass(e.getElement(e.container),e.options.classPrefix+"ios"),p.IS_IPAD&&g.addClass(e.getElement(e.container),e.options.classPrefix+"ipad"),p.IS_IPHONE&&g.addClass(e.getElement(e.container),e.options.classPrefix+"iphone"),g.addClass(e.getElement(e.container),e.isVideo?e.options.classPrefix+"video":e.options.classPrefix+"audio"),p.IS_SAFARI&&!p.IS_IOS){g.addClass(e.getElement(e.container),e.options.classPrefix+"hide-cues");for(var a=e.node.cloneNode(),s=e.node.children,c=[],h=[],y=0,E=s.length;y<E;y++){var b=s[y];!function(){switch(b.tagName.toLowerCase()){case"source":var e={};Array.prototype.slice.call(b.attributes).forEach(function(t){e[t.name]=t.value}),e.type=(0,v.formatType)(e.src,e.type),c.push(e);break;case"track":b.mode="hidden",h.push(b);break;default:a.appendChild(b)}}()}e.node.remove(),e.node=e.media=a,c.length&&(e.mediaFiles=c),h.length&&(e.trackFiles=h)}e.getElement(e.container).querySelector("."+e.options.classPrefix+"mediaelement").appendChild(e.node),e.media.player=e,e.controls=e.getElement(e.container).querySelector("."+e.options.classPrefix+"controls"),e.layers=e.getElement(e.container).querySelector("."+e.options.classPrefix+"layers");var S=e.isVideo?"video":"audio",x=S.substring(0,1).toUpperCase()+S.substring(1);e.options[S+"Width"]>0||e.options[S+"Width"].toString().indexOf("%")>-1?e.width=e.options[S+"Width"]:""!==e.node.style.width&&null!==e.node.style.width?e.width=e.node.style.width:e.node.getAttribute("width")?e.width=e.node.getAttribute("width"):e.width=e.options["default"+x+"Width"],e.options[S+"Height"]>0||e.options[S+"Height"].toString().indexOf("%")>-1?e.height=e.options[S+"Height"]:""!==e.node.style.height&&null!==e.node.style.height?e.height=e.node.style.height:e.node.getAttribute("height")?e.height=e.node.getAttribute("height"):e.height=e.options["default"+x+"Height"],e.initialAspectRatio=e.height>=e.width?e.width/e.height:e.height/e.width,e.setPlayerSize(e.width,e.height),t.pluginWidth=e.width,t.pluginHeight=e.height}if(d.default.MepDefaults=t,new u.default(e.media,t,e.mediaFiles),void 0!==e.getElement(e.container)&&e.options.features.length&&e.controlsAreVisible&&!e.options.hideVideoControlsOnLoad){var w=(0,m.createEvent)("controlsshown",e.getElement(e.container));e.getElement(e.container).dispatchEvent(w)}}},{key:"showControls",value:function(e){var t=this;if(e=void 0===e||e,!t.controlsAreVisible&&t.isVideo){if(e)!function(){g.fadeIn(t.getElement(t.controls),200,function(){g.removeClass(t.getElement(t.controls),t.options.classPrefix+"offscreen");var e=(0,m.createEvent)("controlsshown",t.getElement(t.container));t.getElement(t.container).dispatchEvent(e)});for(var e=t.getElement(t.container).querySelectorAll("."+t.options.classPrefix+"control"),n=0,o=e.length;n<o;n++)!function(n,o){g.fadeIn(e[n],200,function(){g.removeClass(e[n],t.options.classPrefix+"offscreen")})}(n)}();else{g.removeClass(t.getElement(t.controls),t.options.classPrefix+"offscreen"),t.getElement(t.controls).style.display="",t.getElement(t.controls).style.opacity=1;for(var n=t.getElement(t.container).querySelectorAll("."+t.options.classPrefix+"control"),o=0,i=n.length;o<i;o++)g.removeClass(n[o],t.options.classPrefix+"offscreen"),n[o].style.display="";var r=(0,m.createEvent)("controlsshown",t.getElement(t.container));t.getElement(t.container).dispatchEvent(r)}t.controlsAreVisible=!0,t.setControlsSize()}}},{key:"hideControls",value:function(e,t){var n=this;if(e=void 0===e||e,!0===t||!(!n.controlsAreVisible||n.options.alwaysShowControls||n.paused&&4===n.readyState&&(!n.options.hideVideoControlsOnLoad&&n.currentTime<=0||!n.options.hideVideoControlsOnPause&&n.currentTime>0)||n.isVideo&&!n.options.hideVideoControlsOnLoad&&!n.readyState||n.ended)){if(e)!function(){g.fadeOut(n.getElement(n.controls),200,function(){g.addClass(n.getElement(n.controls),n.options.classPrefix+"offscreen"),n.getElement(n.controls).style.display="";var e=(0,m.createEvent)("controlshidden",n.getElement(n.container));n.getElement(n.container).dispatchEvent(e)});for(var e=n.getElement(n.container).querySelectorAll("."+n.options.classPrefix+"control"),t=0,o=e.length;t<o;t++)!function(t,o){g.fadeOut(e[t],200,function(){g.addClass(e[t],n.options.classPrefix+"offscreen"),e[t].style.display=""})}(t)}();else{g.addClass(n.getElement(n.controls),n.options.classPrefix+"offscreen"),n.getElement(n.controls).style.display="",n.getElement(n.controls).style.opacity=0;for(var o=n.getElement(n.container).querySelectorAll("."+n.options.classPrefix+"control"),i=0,r=o.length;i<r;i++)g.addClass(o[i],n.options.classPrefix+"offscreen"),o[i].style.display="";var a=(0,m.createEvent)("controlshidden",n.getElement(n.container));n.getElement(n.container).dispatchEvent(a)}n.controlsAreVisible=!1}}},{key:"startControlsTimer",value:function(e){var t=this;e=void 0!==e?e:t.options.controlsTimeoutDefault,t.killControlsTimer("start"),t.controlsTimer=setTimeout(function(){t.hideControls(),t.killControlsTimer("hide")},e)}},{key:"killControlsTimer",value:function(){var e=this;null!==e.controlsTimer&&(clearTimeout(e.controlsTimer),delete e.controlsTimer,e.controlsTimer=null)}},{key:"disableControls",value:function(){var e=this;e.killControlsTimer(),e.controlsEnabled=!1,e.hideControls(!1,!0)}},{key:"enableControls",value:function(){var e=this;e.controlsEnabled=!0,e.showControls(!1)}},{key:"_setDefaultPlayer",value:function(){var e=this;e.proxy&&e.proxy.pause(),e.proxy=new c.default(e),e.media.addEventListener("loadedmetadata",function(){e.getCurrentTime()>0&&e.currentMediaTime>0&&(e.setCurrentTime(e.currentMediaTime),p.IS_IOS||p.IS_ANDROID||e.play())})}},{key:"_meReady",value:function(e,t){var n=this,o=t.getAttribute("autoplay"),i=!(void 0===o||null===o||"false"===o),r=null!==e.rendererName&&/(native|html5)/i.test(n.media.rendererName);if(n.getElement(n.controls)&&n.enableControls(),n.getElement(n.container)&&n.getElement(n.container).querySelector("."+n.options.classPrefix+"overlay-play")&&(n.getElement(n.container).querySelector("."+n.options.classPrefix+"overlay-play").style.display=""),!n.created){if(n.created=!0,n.media=e,n.domNode=t,!(p.IS_ANDROID&&n.options.AndroidUseNativeControls||p.IS_IPAD&&n.options.iPadUseNativeControls||p.IS_IPHONE&&n.options.iPhoneUseNativeControls)){if(!n.isVideo&&!n.options.features.length&&!n.options.useDefaultControls)return i&&r&&n.play(),void(n.options.success&&("string"==typeof n.options.success?s.default[n.options.success](n.media,n.domNode,n):n.options.success(n.media,n.domNode,n)));if(n.featurePosition={},n._setDefaultPlayer(),n.buildposter(n,n.getElement(n.controls),n.getElement(n.layers),n.media),n.buildkeyboard(n,n.getElement(n.controls),n.getElement(n.layers),n.media),n.buildoverlays(n,n.getElement(n.controls),n.getElement(n.layers),n.media),n.options.useDefaultControls){var a=["playpause","current","progress","duration","tracks","volume","fullscreen"];n.options.features=a.concat(n.options.features.filter(function(e){return-1===a.indexOf(e)}))}n.buildfeatures(n,n.getElement(n.controls),n.getElement(n.layers),n.media);var u=(0,m.createEvent)("controlsready",n.getElement(n.container));n.getElement(n.container).dispatchEvent(u),n.setPlayerSize(n.width,n.height),n.setControlsSize(),n.isVideo&&(n.clickToPlayPauseCallback=function(){if(n.options.clickToPlayPause){var e=n.getElement(n.container).querySelector("."+n.options.classPrefix+"overlay-button"),t=e.getAttribute("aria-pressed");n.paused&&t?n.pause():n.paused?n.play():n.pause(),e.setAttribute("aria-pressed",!t),n.getElement(n.container).focus()}},n.createIframeLayer(),n.media.addEventListener("click",n.clickToPlayPauseCallback),!p.IS_ANDROID&&!p.IS_IOS||n.options.alwaysShowControls?(n.getElement(n.container).addEventListener("mouseenter",function(){n.controlsEnabled&&(n.options.alwaysShowControls||(n.killControlsTimer("enter"),n.showControls(),n.startControlsTimer(n.options.controlsTimeoutMouseEnter)))}),n.getElement(n.container).addEventListener("mousemove",function(){n.controlsEnabled&&(n.controlsAreVisible||n.showControls(),n.options.alwaysShowControls||n.startControlsTimer(n.options.controlsTimeoutMouseEnter))}),n.getElement(n.container).addEventListener("mouseleave",function(){n.controlsEnabled&&(n.paused||n.options.alwaysShowControls||n.startControlsTimer(n.options.controlsTimeoutMouseLeave))})):n.node.addEventListener("touchstart",function(){n.controlsAreVisible?n.hideControls(!1):n.controlsEnabled&&n.showControls(!1)},!!p.SUPPORT_PASSIVE_EVENT&&{passive:!0}),n.options.hideVideoControlsOnLoad&&n.hideControls(!1),n.options.enableAutosize&&n.media.addEventListener("loadedmetadata",function(e){var t=void 0!==e?e.detail.target||e.target:n.media;n.options.videoHeight<=0&&!n.domNode.getAttribute("height")&&!n.domNode.style.height&&null!==t&&!isNaN(t.videoHeight)&&(n.setPlayerSize(t.videoWidth,t.videoHeight),n.setControlsSize(),n.media.setSize(t.videoWidth,t.videoHeight))})),n.media.addEventListener("play",function(){n.hasFocus=!0;for(var e in d.default.players)if(d.default.players.hasOwnProperty(e)){var t=d.default.players[e];t.id===n.id||!n.options.pauseOtherPlayers||t.paused||t.ended||(t.pause(),t.hasFocus=!1)}p.IS_ANDROID||p.IS_IOS||n.options.alwaysShowControls||!n.isVideo||n.hideControls()}),n.media.addEventListener("ended",function(){if(n.options.autoRewind)try{n.setCurrentTime(0),setTimeout(function(){var e=n.getElement(n.container).querySelector("."+n.options.classPrefix+"overlay-loading");e&&e.parentNode&&(e.parentNode.style.display="none")},20)}catch(e){}"function"==typeof n.media.renderer.stop?n.media.renderer.stop():n.pause(),n.setProgressRail&&n.setProgressRail(),n.setCurrentRail&&n.setCurrentRail(),n.options.loop?n.play():!n.options.alwaysShowControls&&n.controlsEnabled&&n.showControls()}),n.media.addEventListener("loadedmetadata",function(){(0,h.calculateTimeFormat)(n.getDuration(),n.options,n.options.framesPerSecond||25),n.updateDuration&&n.updateDuration(),n.updateCurrent&&n.updateCurrent(),n.isFullScreen||(n.setPlayerSize(n.width,n.height),n.setControlsSize())});var c=null;n.media.addEventListener("timeupdate",function(){isNaN(n.getDuration())||c===n.getDuration()||(c=n.getDuration(),(0,h.calculateTimeFormat)(c,n.options,n.options.framesPerSecond||25),n.updateDuration&&n.updateDuration(),n.updateCurrent&&n.updateCurrent(),n.setControlsSize())}),n.getElement(n.container).addEventListener("click",function(e){g.addClass(e.currentTarget,n.options.classPrefix+"container-keyboard-inactive")}),n.getElement(n.container).addEventListener("focusin",function(e){g.removeClass(e.currentTarget,n.options.classPrefix+"container-keyboard-inactive"),!n.isVideo||p.IS_ANDROID||p.IS_IOS||!n.controlsEnabled||n.options.alwaysShowControls||(n.killControlsTimer("enter"),n.showControls(),n.startControlsTimer(n.options.controlsTimeoutMouseEnter))}),n.getElement(n.container).addEventListener("focusout",function(e){setTimeout(function(){e.relatedTarget&&n.keyboardAction&&!e.relatedTarget.closest("."+n.options.classPrefix+"container")&&(n.keyboardAction=!1,!n.isVideo||n.options.alwaysShowControls||n.paused||n.startControlsTimer(n.options.controlsTimeoutMouseLeave))},0)}),setTimeout(function(){n.setPlayerSize(n.width,n.height),n.setControlsSize()},0),n.globalResizeCallback=function(){n.isFullScreen||p.HAS_TRUE_NATIVE_FULLSCREEN&&l.default.webkitIsFullScreen||n.setPlayerSize(n.width,n.height),n.setControlsSize()},n.globalBind("resize",n.globalResizeCallback)}i&&r&&n.play(),n.options.success&&("string"==typeof n.options.success?s.default[n.options.success](n.media,n.domNode,n):n.options.success(n.media,n.domNode,n))}}},{key:"_handleError",value:function(e,t,n){var o=this,i=o.getElement(o.layers).querySelector("."+o.options.classPrefix+"overlay-play");i&&(i.style.display="none"),o.options.error&&o.options.error(e,t,n),o.getElement(o.container).querySelector("."+o.options.classPrefix+"cannotplay")&&o.getElement(o.container).querySelector("."+o.options.classPrefix+"cannotplay").remove();var r=l.default.createElement("div");r.className=o.options.classPrefix+"cannotplay",r.style.width="100%",r.style.height="100%";var a="function"==typeof o.options.customError?o.options.customError(o.media,o.media.originalNode):o.options.customError,s="";if(!a){var u=o.media.originalNode.getAttribute("poster");if(u&&(s='<img src="'+u+'" alt="'+d.default.i18n.t("mejs.download-file")+'">'),e.message&&(a="<p>"+e.message+"</p>"),e.urls)for(var c=0,f=e.urls.length;c<f;c++){var p=e.urls[c];a+='<a href="'+p.src+'" data-type="'+p.type+'"><span>'+d.default.i18n.t("mejs.download-file")+": "+p.src+"</span></a>"}}a&&o.getElement(o.layers).querySelector("."+o.options.classPrefix+"overlay-error")&&(r.innerHTML=a,o.getElement(o.layers).querySelector("."+o.options.classPrefix+"overlay-error").innerHTML=""+s+r.outerHTML,o.getElement(o.layers).querySelector("."+o.options.classPrefix+"overlay-error").parentNode.style.display="block"),o.controlsEnabled&&o.disableControls()}},{key:"setPlayerSize",value:function(e,t){var n=this;if(!n.options.setDimensions)return!1;switch(void 0!==e&&(n.width=e),void 0!==t&&(n.height=t),n.options.stretching){case"fill":n.isVideo?n.setFillMode():n.setDimensions(n.width,n.height);break;case"responsive":n.setResponsiveMode();break;case"none":n.setDimensions(n.width,n.height);break;default:!0===n.hasFluidMode()?n.setResponsiveMode():n.setDimensions(n.width,n.height)}}},{key:"hasFluidMode",value:function(){var e=this;return-1!==e.height.toString().indexOf("%")||e.node&&e.node.style.maxWidth&&"none"!==e.node.style.maxWidth&&e.node.style.maxWidth!==e.width||e.node&&e.node.currentStyle&&"100%"===e.node.currentStyle.maxWidth}},{key:"setResponsiveMode",value:function(){var e=this,t=function(){for(var t=void 0,n=e.getElement(e.container);n;){try{if(p.IS_FIREFOX&&"html"===n.tagName.toLowerCase()&&s.default.self!==s.default.top&&null!==s.default.frameElement)return s.default.frameElement;t=n.parentElement}catch(e){t=n.parentElement}if(t&&g.visible(t))return t;n=t}return null}(),n=t?getComputedStyle(t,null):getComputedStyle(l.default.body,null),o=e.isVideo?e.media.videoWidth&&e.media.videoWidth>0?e.media.videoWidth:e.node.getAttribute("width")?e.node.getAttribute("width"):e.options.defaultVideoWidth:e.options.defaultAudioWidth,i=e.isVideo?e.media.videoHeight&&e.media.videoHeight>0?e.media.videoHeight:e.node.getAttribute("height")?e.node.getAttribute("height"):e.options.defaultVideoHeight:e.options.defaultAudioHeight,r=function(){var t=1;return e.isVideo?(t=e.media.videoWidth&&e.media.videoWidth>0&&e.media.videoHeight&&e.media.videoHeight>0?e.height>=e.width?e.media.videoWidth/e.media.videoHeight:e.media.videoHeight/e.media.videoWidth:e.initialAspectRatio,(isNaN(t)||t<.01||t>100)&&(t=1),t):t}(),a=parseFloat(n.height),d=void 0,u=parseFloat(n.width);if(d=e.isVideo?"100%"===e.height?parseFloat(u*i/o,10):e.height>=e.width?parseFloat(u/r,10):parseFloat(u*r,10):i,isNaN(d)&&(d=a),e.getElement(e.container).parentNode.length>0&&"body"===e.getElement(e.container).parentNode.tagName.toLowerCase()&&(u=s.default.innerWidth||l.default.documentElement.clientWidth||l.default.body.clientWidth,d=s.default.innerHeight||l.default.documentElement.clientHeight||l.default.body.clientHeight),d&&u){e.getElement(e.container).style.width=u+"px",e.getElement(e.container).style.height=d+"px",e.node.style.width="100%",e.node.style.height="100%",e.isVideo&&e.media.setSize&&e.media.setSize(u,d);for(var c=e.getElement(e.layers).children,f=0,m=c.length;f<m;f++)c[f].style.width="100%",c[f].style.height="100%"}}},{key:"setFillMode",value:function(){var e=this,t=s.default.self!==s.default.top&&null!==s.default.frameElement,n=function(){for(var t=void 0,n=e.getElement(e.container);n;){try{if(p.IS_FIREFOX&&"html"===n.tagName.toLowerCase()&&s.default.self!==s.default.top&&null!==s.default.frameElement)return s.default.frameElement;t=n.parentElement}catch(e){t=n.parentElement}if(t&&g.visible(t))return t;n=t}return null}(),o=n?getComputedStyle(n,null):getComputedStyle(l.default.body,null);"none"!==e.node.style.height&&e.node.style.height!==e.height&&(e.node.style.height="auto"),"none"!==e.node.style.maxWidth&&e.node.style.maxWidth!==e.width&&(e.node.style.maxWidth="none"),"none"!==e.node.style.maxHeight&&e.node.style.maxHeight!==e.height&&(e.node.style.maxHeight="none"),e.node.currentStyle&&("100%"===e.node.currentStyle.height&&(e.node.currentStyle.height="auto"),"100%"===e.node.currentStyle.maxWidth&&(e.node.currentStyle.maxWidth="none"),"100%"===e.node.currentStyle.maxHeight&&(e.node.currentStyle.maxHeight="none")),t||parseFloat(o.width)||(n.style.width=e.media.offsetWidth+"px"),t||parseFloat(o.height)||(n.style.height=e.media.offsetHeight+"px"),o=getComputedStyle(n);var i=parseFloat(o.width),r=parseFloat(o.height);e.setDimensions("100%","100%");var a=e.getElement(e.container).querySelector("."+e.options.classPrefix+"poster>img");a&&(a.style.display="");for(var d=e.getElement(e.container).querySelectorAll("object, embed, iframe, video"),u=e.height,c=e.width,f=i,m=u*i/c,h=c*r/u,v=r,y=h>i==!1,E=y?Math.floor(f):Math.floor(h),b=y?Math.floor(m):Math.floor(v),S=y?i+"px":E+"px",x=y?b+"px":r+"px",w=0,P=d.length;w<P;w++)d[w].style.height=x,d[w].style.width=S,e.media.setSize&&e.media.setSize(S,x),d[w].style.marginLeft=Math.floor((i-E)/2)+"px",d[w].style.marginTop=0}},{key:"setDimensions",value:function(e,t){var n=this;e=(0,m.isString)(e)&&e.indexOf("%")>-1?e:parseFloat(e)+"px",t=(0,m.isString)(t)&&t.indexOf("%")>-1?t:parseFloat(t)+"px",n.getElement(n.container).style.width=e,n.getElement(n.container).style.height=t;for(var o=n.getElement(n.layers).children,i=0,r=o.length;i<r;i++)o[i].style.width=e,o[i].style.height=t}},{key:"setControlsSize",value:function(){var e=this;if(g.visible(e.getElement(e.container)))if(e.rail&&g.visible(e.rail)){for(var t=e.total?getComputedStyle(e.total,null):null,n=t?parseFloat(t.marginLeft)+parseFloat(t.marginRight):0,o=getComputedStyle(e.rail),i=parseFloat(o.marginLeft)+parseFloat(o.marginRight),r=0,a=g.siblings(e.rail,function(t){return t!==e.rail}),s=a.length,l=0;l<s;l++)r+=a[l].offsetWidth;r+=n+(0===n?2*i:i)+1,e.getElement(e.container).style.minWidth=r+"px";var d=(0,m.createEvent)("controlsresize",e.getElement(e.container));e.getElement(e.container).dispatchEvent(d)}else{for(var u=e.getElement(e.controls).children,c=0,f=0,p=u.length;f<p;f++)c+=u[f].offsetWidth;e.getElement(e.container).style.minWidth=c+"px"}}},{key:"addControlElement",value:function(e,t){var n=this;if(void 0!==n.featurePosition[t]){var o=n.getElement(n.controls).children[n.featurePosition[t]-1];o.parentNode.insertBefore(e,o.nextSibling)}else{n.getElement(n.controls).appendChild(e);for(var i=n.getElement(n.controls).children,r=0,a=i.length;r<a;r++)if(e===i[r]){n.featurePosition[t]=r;break}}}},{key:"createIframeLayer",value:function(){var e=this;if(e.isVideo&&null!==e.media.rendererName&&e.media.rendererName.indexOf("iframe")>-1&&!l.default.getElementById(e.media.id+"-iframe-overlay")){var t=l.default.createElement("div"),n=l.default.getElementById(e.media.id+"_"+e.media.rendererName);t.id=e.media.id+"-iframe-overlay",t.className=e.options.classPrefix+"iframe-overlay",t.addEventListener("click",function(t){e.options.clickToPlayPause&&(e.paused?e.play():e.pause(),t.preventDefault(),t.stopPropagation())}),n.parentNode.insertBefore(t,n)}}},{key:"resetSize",value:function(){var e=this;setTimeout(function(){e.setPlayerSize(e.width,e.height),e.setControlsSize()},50)}},{key:"setPoster",value:function(e){var t=this;if(t.getElement(t.container)){var n=t.getElement(t.container).querySelector("."+t.options.classPrefix+"poster");n||((n=l.default.createElement("div")).className=t.options.classPrefix+"poster "+t.options.classPrefix+"layer",t.getElement(t.layers).appendChild(n));var o=n.querySelector("img");!o&&e&&((o=l.default.createElement("img")).className=t.options.classPrefix+"poster-img",o.width="100%",o.height="100%",n.style.display="",n.appendChild(o)),e?(o.setAttribute("src",e),n.style.backgroundImage='url("'+e+'")',n.style.display=""):o?(n.style.backgroundImage="none",n.style.display="none",o.remove()):n.style.display="none"}else(p.IS_IPAD&&t.options.iPadUseNativeControls||p.IS_IPHONE&&t.options.iPhoneUseNativeControls||p.IS_ANDROID&&t.options.AndroidUseNativeControls)&&(t.media.originalNode.poster=e)}},{key:"changeSkin",value:function(e){var t=this;t.getElement(t.container).className=t.options.classPrefix+"container "+e,t.setPlayerSize(t.width,t.height),t.setControlsSize()}},{key:"globalBind",value:function(e,t){var n=this,o=n.node?n.node.ownerDocument:l.default;if((e=(0,m.splitEvents)(e,n.id)).d)for(var i=e.d.split(" "),r=0,a=i.length;r<a;r++)i[r].split(".").reduce(function(e,n){return o.addEventListener(n,t,!1),n},"");if(e.w)for(var d=e.w.split(" "),u=0,c=d.length;u<c;u++)d[u].split(".").reduce(function(e,n){return s.default.addEventListener(n,t,!1),n},"")}},{key:"globalUnbind",value:function(e,t){var n=this,o=n.node?n.node.ownerDocument:l.default;if((e=(0,m.splitEvents)(e,n.id)).d)for(var i=e.d.split(" "),r=0,a=i.length;r<a;r++)i[r].split(".").reduce(function(e,n){return o.removeEventListener(n,t,!1),n},"");if(e.w)for(var d=e.w.split(" "),u=0,c=d.length;u<c;u++)d[u].split(".").reduce(function(e,n){return s.default.removeEventListener(n,t,!1),n},"")}},{key:"buildfeatures",value:function(e,t,n,o){for(var i=this,r=0,a=i.options.features.length;r<a;r++){var s=i.options.features[r];if(i["build"+s])try{i["build"+s](e,t,n,o)}catch(e){console.error("error building "+s,e)}}}},{key:"buildposter",value:function(e,t,n,o){var i=this,r=l.default.createElement("div");r.className=i.options.classPrefix+"poster "+i.options.classPrefix+"layer",n.appendChild(r);var a=o.originalNode.getAttribute("poster");""!==e.options.poster&&(a&&p.IS_IOS&&o.originalNode.removeAttribute("poster"),a=e.options.poster),a?i.setPoster(a):null!==i.media.renderer&&"function"==typeof i.media.renderer.getPosterUrl?i.setPoster(i.media.renderer.getPosterUrl()):r.style.display="none",o.addEventListener("play",function(){r.style.display="none"}),o.addEventListener("playing",function(){r.style.display="none"}),e.options.showPosterWhenEnded&&e.options.autoRewind&&o.addEventListener("ended",function(){r.style.display=""}),o.addEventListener("error",function(){r.style.display="none"}),e.options.showPosterWhenPaused&&o.addEventListener("pause",function(){e.ended||(r.style.display="")})}},{key:"buildoverlays",value:function(e,t,n,o){if(e.isVideo){var i=this,r=l.default.createElement("div"),a=l.default.createElement("div"),s=l.default.createElement("div");r.style.display="none",r.className=i.options.classPrefix+"overlay "+i.options.classPrefix+"layer",r.innerHTML='<div class="'+i.options.classPrefix+'overlay-loading"><span class="'+i.options.classPrefix+'overlay-loading-bg-img"></span></div>',n.appendChild(r),a.style.display="none",a.className=i.options.classPrefix+"overlay "+i.options.classPrefix+"layer",a.innerHTML='<div class="'+i.options.classPrefix+'overlay-error"></div>',n.appendChild(a),s.className=i.options.classPrefix+"overlay "+i.options.classPrefix+"layer "+i.options.classPrefix+"overlay-play",s.innerHTML='<div class="'+i.options.classPrefix+'overlay-button" role="button" tabindex="0" aria-label="'+f.default.t("mejs.play")+'" aria-pressed="false"></div>',s.addEventListener("click",function(){if(i.options.clickToPlayPause){var e=i.getElement(i.container).querySelector("."+i.options.classPrefix+"overlay-button"),t=e.getAttribute("aria-pressed");i.paused?i.play():i.pause(),e.setAttribute("aria-pressed",!!t),i.getElement(i.container).focus()}}),s.addEventListener("keydown",function(e){var t=e.keyCode||e.which||0;if(13===t||p.IS_FIREFOX&&32===t){var n=(0,m.createEvent)("click",s);return s.dispatchEvent(n),!1}}),n.appendChild(s),null!==i.media.rendererName&&(/(youtube|facebook)/i.test(i.media.rendererName)&&!(i.media.originalNode.getAttribute("poster")||e.options.poster||"function"==typeof i.media.renderer.getPosterUrl&&i.media.renderer.getPosterUrl())||p.IS_STOCK_ANDROID||i.media.originalNode.getAttribute("autoplay"))&&(s.style.display="none");var d=!1;o.addEventListener("play",function(){s.style.display="none",r.style.display="none",a.style.display="none",d=!1}),o.addEventListener("playing",function(){s.style.display="none",r.style.display="none",a.style.display="none",d=!1}),o.addEventListener("seeking",function(){s.style.display="none",r.style.display="",d=!1}),o.addEventListener("seeked",function(){s.style.display=i.paused&&!p.IS_STOCK_ANDROID?"":"none",r.style.display="none",d=!1}),o.addEventListener("pause",function(){r.style.display="none",p.IS_STOCK_ANDROID||d||(s.style.display=""),d=!1}),o.addEventListener("waiting",function(){r.style.display="",d=!1}),o.addEventListener("loadeddata",function(){r.style.display="",p.IS_ANDROID&&(o.canplayTimeout=setTimeout(function(){if(l.default.createEvent){var e=l.default.createEvent("HTMLEvents");return e.initEvent("canplay",!0,!0),o.dispatchEvent(e)}},300)),d=!1}),o.addEventListener("canplay",function(){r.style.display="none",clearTimeout(o.canplayTimeout),d=!1}),o.addEventListener("error",function(e){i._handleError(e,i.media,i.node),r.style.display="none",s.style.display="none",d=!0}),o.addEventListener("loadedmetadata",function(){i.controlsEnabled||i.enableControls()}),o.addEventListener("keydown",function(t){i.onkeydown(e,o,t),d=!1})}}},{key:"buildkeyboard",value:function(e,t,n,o){var i=this;i.getElement(i.container).addEventListener("keydown",function(){i.keyboardAction=!0}),i.globalKeydownCallback=function(t){var n=l.default.activeElement.closest("."+i.options.classPrefix+"container"),r=i.media.closest("."+i.options.classPrefix+"container");return i.hasFocus=!(!n||!r||n.id!==r.id),i.onkeydown(e,o,t)},i.globalClickCallback=function(e){i.hasFocus=!!e.target.closest("."+i.options.classPrefix+"container")},i.globalBind("keydown",i.globalKeydownCallback),i.globalBind("click",i.globalClickCallback)}},{key:"onkeydown",value:function(e,t,n){if(e.hasFocus&&e.options.enableKeyboard)for(var o=0,i=e.options.keyActions.length;o<i;o++)for(var r=e.options.keyActions[o],a=0,s=r.keys.length;a<s;a++)if(n.keyCode===r.keys[a])return r.action(e,t,n.keyCode,n),n.preventDefault(),void n.stopPropagation();return!0}},{key:"play",value:function(){this.proxy.play()}},{key:"pause",value:function(){this.proxy.pause()}},{key:"load",value:function(){this.proxy.load()}},{key:"setCurrentTime",value:function(e){this.proxy.setCurrentTime(e)}},{key:"getCurrentTime",value:function(){return this.proxy.currentTime}},{key:"getDuration",value:function(){return this.proxy.duration}},{key:"setVolume",value:function(e){this.proxy.volume=e}},{key:"getVolume",value:function(){return this.proxy.getVolume()}},{key:"setMuted",value:function(e){this.proxy.setMuted(e)}},{key:"setSrc",value:function(e){this.controlsEnabled||this.enableControls(),this.proxy.setSrc(e)}},{key:"getSrc",value:function(){return this.proxy.getSrc()}},{key:"canPlayType",value:function(e){return this.proxy.canPlayType(e)}},{key:"remove",value:function(){var e=this,t=e.media.rendererName,n=e.media.originalNode.src;for(var o in e.options.features){var i=e.options.features[o];if(e["clean"+i])try{e["clean"+i](e,e.getElement(e.layers),e.getElement(e.controls),e.media)}catch(e){console.error("error cleaning "+i,e)}}var a=e.node.getAttribute("width"),s=e.node.getAttribute("height");a?-1===a.indexOf("%")&&(a+="px"):a="auto",s?-1===s.indexOf("%")&&(s+="px"):s="auto",e.node.style.width=a,e.node.style.height=s,e.setPlayerSize(0,0),e.isDynamic?e.getElement(e.container).parentNode.insertBefore(e.node,e.getElement(e.container)):function(){e.node.setAttribute("controls",!0),e.node.setAttribute("id",e.node.getAttribute("id").replace("_"+t,"").replace("_from_mejs",""));var o=e.getElement(e.container).querySelector("."+e.options.classPrefix+"poster>img");o&&e.node.setAttribute("poster",o.src),delete e.node.autoplay,""!==e.media.canPlayType((0,v.getTypeFromFile)(n))&&e.node.setAttribute("src",n),~t.indexOf("iframe")&&l.default.getElementById(e.media.id+"-iframe-overlay").remove();var i=e.node.cloneNode();if(i.style.display="",e.getElement(e.container).parentNode.insertBefore(i,e.getElement(e.container)),e.node.remove(),e.mediaFiles)for(var r=0,a=e.mediaFiles.length;r<a;r++){var s=l.default.createElement("source");s.setAttribute("src",e.mediaFiles[r].src),s.setAttribute("type",e.mediaFiles[r].type),i.appendChild(s)}if(e.trackFiles)for(var d=0,u=e.trackFiles.length;d<u;d++)!function(t,n){var o=e.trackFiles[t],r=l.default.createElement("track");r.kind=o.kind,r.label=o.label,r.srclang=o.srclang,r.src=o.src,i.appendChild(r),r.addEventListener("load",function(){this.mode="showing",i.textTracks[t].mode="showing"})}(d);delete e.node,delete e.mediaFiles,delete e.trackFiles}(),"function"==typeof e.media.renderer.destroy&&e.media.renderer.destroy(),delete d.default.players[e.id],"object"===r(e.getElement(e.container))&&(e.getElement(e.container).parentNode.querySelector("."+e.options.classPrefix+"offscreen").remove(),e.getElement(e.container).remove()),e.globalUnbind("resize",e.globalResizeCallback),e.globalUnbind("keydown",e.globalKeydownCallback),e.globalUnbind("click",e.globalClickCallback),delete e.media.player}},{key:"paused",get:function(){return this.proxy.paused}},{key:"muted",get:function(){return this.proxy.muted},set:function(e){this.setMuted(e)}},{key:"ended",get:function(){return this.proxy.ended}},{key:"readyState",get:function(){return this.proxy.readyState}},{key:"currentTime",set:function(e){this.setCurrentTime(e)},get:function(){return this.getCurrentTime()}},{key:"duration",get:function(){return this.getDuration()}},{key:"volume",set:function(e){this.setVolume(e)},get:function(){return this.getVolume()}},{key:"src",set:function(e){this.setSrc(e)},get:function(){return this.getSrc()}}]),e}();s.default.MediaElementPlayer=E,d.default.MediaElementPlayer=E,n.default=E},{17:17,2:2,25:25,26:26,27:27,28:28,3:3,30:30,5:5,6:6,7:7}],17:[function(e,t,n){"use strict";function o(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}Object.defineProperty(n,"__esModule",{value:!0});var i=function(){function e(e,t){for(var n=0;n<t.length;n++){var o=t[n];o.enumerable=o.enumerable||!1,o.configurable=!0,"value"in o&&(o.writable=!0),Object.defineProperty(e,o.key,o)}}return function(t,n,o){return n&&e(t.prototype,n),o&&e(t,o),t}}(),r=function(e){return e&&e.__esModule?e:{default:e}}(e(3)),a=function(){function e(t){return o(this,e),this.media=t.media,this.isVideo=t.isVideo,this.classPrefix=t.options.classPrefix,this.createIframeLayer=function(){return t.createIframeLayer()},this.setPoster=function(e){return t.setPoster(e)},this}return i(e,[{key:"play",value:function(){this.media.play()}},{key:"pause",value:function(){this.media.pause()}},{key:"load",value:function(){var e=this;e.isLoaded||e.media.load(),e.isLoaded=!0}},{key:"setCurrentTime",value:function(e){this.media.setCurrentTime(e)}},{key:"getCurrentTime",value:function(){return this.media.currentTime}},{key:"getDuration",value:function(){return this.media.getDuration()}},{key:"setVolume",value:function(e){this.media.setVolume(e)}},{key:"getVolume",value:function(){return this.media.getVolume()}},{key:"setMuted",value:function(e){this.media.setMuted(e)}},{key:"setSrc",value:function(e){var t=this,n=document.getElementById(t.media.id+"-iframe-overlay");n&&n.remove(),t.media.setSrc(e),t.createIframeLayer(),null!==t.media.renderer&&"function"==typeof t.media.renderer.getPosterUrl&&t.setPoster(t.media.renderer.getPosterUrl())}},{key:"getSrc",value:function(){return this.media.getSrc()}},{key:"canPlayType",value:function(e){return this.media.canPlayType(e)}},{key:"paused",get:function(){return this.media.paused}},{key:"muted",set:function(e){this.setMuted(e)},get:function(){return this.media.muted}},{key:"ended",get:function(){return this.media.ended}},{key:"readyState",get:function(){return this.media.readyState}},{key:"currentTime",set:function(e){this.setCurrentTime(e)},get:function(){return this.getCurrentTime()}},{key:"duration",get:function(){return this.getDuration()}},{key:"volume",set:function(e){this.setVolume(e)},get:function(){return this.getVolume()}},{key:"src",set:function(e){this.setSrc(e)},get:function(){return this.getSrc()}}]),e}();n.default=a,r.default.DefaultPlayer=a},{3:3}],18:[function(e,t,n){"use strict";function o(e){return e&&e.__esModule?e:{default:e}}var i=o(e(3)),r=o(e(7)),a=o(e(16));"undefined"!=typeof jQuery?r.default.$=i.default.jQuery=i.default.$=jQuery:"undefined"!=typeof Zepto?r.default.$=i.default.Zepto=i.default.$=Zepto:"undefined"!=typeof ender&&(r.default.$=i.default.ender=i.default.$=ender),function(e){void 0!==e&&(e.fn.mediaelementplayer=function(t){return!1===t?this.each(function(){var t=e(this).data("mediaelementplayer");t&&t.remove(),e(this).removeData("mediaelementplayer")}):this.each(function(){e(this).data("mediaelementplayer",new a.default(this,t))}),this},e(document).ready(function(){e("."+r.default.MepDefaults.classPrefix+"player").mediaelementplayer()}))}(r.default.$)},{16:16,3:3,7:7}],19:[function(e,t,n){"use strict";function o(e){return e&&e.__esModule?e:{default:e}}var i="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e},r=o(e(3)),a=o(e(7)),s=e(8),l=e(27),d=e(28),u=e(25),c=e(26),f={promise:null,load:function(e){return"undefined"!=typeof dashjs?f.promise=new Promise(function(e){e()}).then(function(){f._createPlayer(e)}):(e.options.path="string"==typeof e.options.path?e.options.path:"https://cdn.dashjs.org/latest/dash.all.min.js",f.promise=f.promise||(0,c.loadScript)(e.options.path),f.promise.then(function(){f._createPlayer(e)})),f.promise},_createPlayer:function(e){var t=dashjs.MediaPlayer().create();return r.default["__ready__"+e.id](t),t}},p={name:"native_dash",options:{prefix:"native_dash",dash:{path:"https://cdn.dashjs.org/latest/dash.all.min.js",debug:!1,drm:{},robustnessLevel:""}},canPlayType:function(e){return u.HAS_MSE&&["application/dash+xml"].indexOf(e.toLowerCase())>-1},create:function(e,t,n){var o=e.originalNode,d=e.id+"_"+t.prefix,u=o.autoplay,c=o.children,p=null,m=null;o.removeAttribute("type");for(var h=0,v=c.length;h<v;h++)c[h].removeAttribute("type");p=o.cloneNode(!0),t=Object.assign(t,e.options);for(var g=a.default.html5media.properties,y=a.default.html5media.events.concat(["click","mouseover","mouseout"]),E=function(t){if("error"!==t.type){var n=(0,l.createEvent)(t.type,e);e.dispatchEvent(n)}},b=0,S=g.length;b<S;b++)!function(e){var n=""+e.substring(0,1).toUpperCase()+e.substring(1);p["get"+n]=function(){return null!==m?p[e]:null},p["set"+n]=function(n){if(-1===a.default.html5media.readOnlyProperties.indexOf(e))if("src"===e){var o="object"===(void 0===n?"undefined":i(n))&&n.src?n.src:n;if(p[e]=o,null!==m){m.reset();for(var r=0,s=y.length;r<s;r++)p.removeEventListener(y[r],E);m=f._createPlayer({options:t.dash,id:d}),n&&"object"===(void 0===n?"undefined":i(n))&&"object"===i(n.drm)&&(m.setProtectionData(n.drm),(0,l.isString)(t.dash.robustnessLevel)&&t.dash.robustnessLevel&&m.getProtectionController().setRobustnessLevel(t.dash.robustnessLevel)),m.attachSource(o),u&&m.play()}}else p[e]=n}}(g[b]);if(r.default["__ready__"+d]=function(n){e.dashPlayer=m=n;for(var o=dashjs.MediaPlayer.events,r=0,s=y.length;r<s;r++)!function(e){"loadedmetadata"===e&&(m.getDebug().setLogToBrowserConsole(t.dash.debug),m.initialize(),m.setScheduleWhilePaused(!1),m.setFastSwitchEnabled(!0),m.attachView(p),m.setAutoPlay(!1),"object"!==i(t.dash.drm)||a.default.Utils.isObjectEmpty(t.dash.drm)||(m.setProtectionData(t.dash.drm),(0,l.isString)(t.dash.robustnessLevel)&&t.dash.robustnessLevel&&m.getProtectionController().setRobustnessLevel(t.dash.robustnessLevel)),m.attachSource(p.getSrc())),p.addEventListener(e,E)}(y[r]);var d=function(t,n){if("error"===t.toLowerCase())e.generateError(n.message,p.src),console.error(n);else{var o=(0,l.createEvent)(t,e);o.data=n,e.dispatchEvent(o)}};for(var u in o)o.hasOwnProperty(u)&&m.on(o[u],function(e){for(var t=arguments.length,n=Array(t>1?t-1:0),o=1;o<t;o++)n[o-1]=arguments[o];return d(e.type,n)})},n&&n.length>0)for(var x=0,w=n.length;x<w;x++)if(s.renderer.renderers[t.prefix].canPlayType(n[x].type)){p.setAttribute("src",n[x].src),void 0!==n[x].drm&&(t.dash.drm=n[x].drm);break}p.setAttribute("id",d),o.parentNode.insertBefore(p,o),o.autoplay=!1,o.style.display="none",p.setSize=function(e,t){return p.style.width=e+"px",p.style.height=t+"px",p},p.hide=function(){return p.pause(),p.style.display="none",p},p.show=function(){return p.style.display="",p},p.destroy=function(){null!==m&&m.reset()};var P=(0,l.createEvent)("rendererready",p);return e.dispatchEvent(P),e.promises.push(f.load({options:t.dash,id:d})),p}};d.typeChecks.push(function(e){return~e.toLowerCase().indexOf(".mpd")?"application/dash+xml":null}),s.renderer.add(p)},{25:25,26:26,27:27,28:28,3:3,7:7,8:8}],20:[function(e,t,n){"use strict";function o(e){return e&&e.__esModule?e:{default:e}}Object.defineProperty(n,"__esModule",{value:!0}),n.PluginDetector=void 0;var i="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e},r=o(e(3)),a=o(e(2)),s=o(e(7)),l=o(e(5)),d=e(8),u=e(27),c=e(25),f=e(28),p=n.PluginDetector={plugins:[],hasPluginVersion:function(e,t){var n=p.plugins[e];return t[1]=t[1]||0,t[2]=t[2]||0,n[0]>t[0]||n[0]===t[0]&&n[1]>t[1]||n[0]===t[0]&&n[1]===t[1]&&n[2]>=t[2]},addPlugin:function(e,t,n,o,i){p.plugins[e]=p.detectPlugin(t,n,o,i)},detectPlugin:function(e,t,n,o){var a=[0,0,0],s=void 0,l=void 0;if(null!==c.NAV.plugins&&void 0!==c.NAV.plugins&&"object"===i(c.NAV.plugins[e])){if((s=c.NAV.plugins[e].description)&&(void 0===c.NAV.mimeTypes||!c.NAV.mimeTypes[t]||c.NAV.mimeTypes[t].enabledPlugin))for(var d=0,u=(a=s.replace(e,"").replace(/^\s+/,"").replace(/\sr/gi,".").split(".")).length;d<u;d++)a[d]=parseInt(a[d].match(/\d+/),10)}else if(void 0!==r.default.ActiveXObject)try{(l=new ActiveXObject(n))&&(a=o(l))}catch(e){}return a}};p.addPlugin("flash","Shockwave Flash","application/x-shockwave-flash","ShockwaveFlash.ShockwaveFlash",function(e){var t=[],n=e.GetVariable("$version");return n&&(n=n.split(" ")[1].split(","),t=[parseInt(n[0],10),parseInt(n[1],10),parseInt(n[2],10)]),t});var m={create:function(e,t,n){var o={},i=!1;o.options=t,o.id=e.id+"_"+o.options.prefix,o.mediaElement=e,o.flashState={},o.flashApi=null,o.flashApiStack=[];for(var p=s.default.html5media.properties,m=0,h=p.length;m<h;m++)!function(e){o.flashState[e]=null;var t=""+e.substring(0,1).toUpperCase()+e.substring(1);o["get"+t]=function(){if(null!==o.flashApi){if("function"==typeof o.flashApi["get_"+e]){var t=o.flashApi["get_"+e]();return"buffered"===e?{start:function(){return 0},end:function(){return t},length:1}:t}return null}return null},o["set"+t]=function(t){if("src"===e&&(t=(0,f.absolutizeUrl)(t)),null!==o.flashApi&&void 0!==o.flashApi["set_"+e])try{o.flashApi["set_"+e](t)}catch(e){}else o.flashApiStack.push({type:"set",propName:e,value:t})}}(p[m]);var v=s.default.html5media.methods;v.push("stop");for(var g=0,y=v.length;g<y;g++)!function(e){o[e]=function(){if(i)if(null!==o.flashApi){if(o.flashApi["fire_"+e])try{o.flashApi["fire_"+e]()}catch(e){}}else o.flashApiStack.push({type:"call",methodName:e})}}(v[g]);for(var E=["rendererready"],b=0,S=E.length;b<S;b++){var x=(0,u.createEvent)(E[b],o);e.dispatchEvent(x)}r.default["__ready__"+o.id]=function(){if(o.flashReady=!0,o.flashApi=a.default.getElementById("__"+o.id),o.flashApiStack.length)for(var e=0,t=o.flashApiStack.length;e<t;e++){var n=o.flashApiStack[e];if("set"===n.type){var i=n.propName,r=""+i.substring(0,1).toUpperCase()+i.substring(1);o["set"+r](n.value)}else"call"===n.type&&o[n.methodName]()}},r.default["__event__"+o.id]=function(e,t){var n=(0,u.createEvent)(e,o);if(t)try{n.data=JSON.parse(t),n.details.data=JSON.parse(t)}catch(e){n.message=t}o.mediaElement.dispatchEvent(n)},o.flashWrapper=a.default.createElement("div"),-1===["always","sameDomain"].indexOf(o.options.shimScriptAccess)&&(o.options.shimScriptAccess="sameDomain");var w=e.originalNode.autoplay,P=["uid="+o.id,"autoplay="+w,"allowScriptAccess="+o.options.shimScriptAccess,"preload="+(e.originalNode.getAttribute("preload")||"")],T=null!==e.originalNode&&"video"===e.originalNode.tagName.toLowerCase(),C=T?e.originalNode.height:1,k=T?e.originalNode.width:1;e.originalNode.getAttribute("src")&&P.push("src="+e.originalNode.getAttribute("src")),!0===o.options.enablePseudoStreaming&&(P.push("pseudostreamstart="+o.options.pseudoStreamingStartQueryParam),P.push("pseudostreamtype="+o.options.pseudoStreamingType)),o.options.streamDelimiter&&P.push("streamdelimiter="+encodeURIComponent(o.options.streamDelimiter)),o.options.proxyType&&P.push("proxytype="+o.options.proxyType),e.appendChild(o.flashWrapper),e.originalNode.style.display="none";var _=[];if(c.IS_IE||c.IS_EDGE){var N=a.default.createElement("div");o.flashWrapper.appendChild(N),_=c.IS_EDGE?['type="application/x-shockwave-flash"','data="'+o.options.pluginPath+o.options.filename+'"','id="__'+o.id+'"','width="'+k+'"','height="'+C+"'\""]:['classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000"','codebase="//download.macromedia.com/pub/shockwave/cabs/flash/swflash.cab"','id="__'+o.id+'"','width="'+k+'"','height="'+C+'"'],T||_.push('style="clip: rect(0 0 0 0); position: absolute;"'),N.outerHTML="<object "+_.join(" ")+'><param name="movie" value="'+o.options.pluginPath+o.options.filename+"?x="+new Date+'" /><param name="flashvars" value="'+P.join("&amp;")+'" /><param name="quality" value="high" /><param name="bgcolor" value="#000000" /><param name="wmode" value="transparent" /><param name="allowScriptAccess" value="'+o.options.shimScriptAccess+'" /><param name="allowFullScreen" value="true" /><div>'+l.default.t("mejs.install-flash")+"</div></object>"}else _=['id="__'+o.id+'"','name="__'+o.id+'"','play="true"','loop="false"','quality="high"','bgcolor="#000000"','wmode="transparent"','allowScriptAccess="'+o.options.shimScriptAccess+'"','allowFullScreen="true"','type="application/x-shockwave-flash"','pluginspage="//www.macromedia.com/go/getflashplayer"','src="'+o.options.pluginPath+o.options.filename+'"','flashvars="'+P.join("&")+'"'],T?(_.push('width="'+k+'"'),_.push('height="'+C+'"')):_.push('style="position: fixed; left: -9999em; top: -9999em;"'),o.flashWrapper.innerHTML="<embed "+_.join(" ")+">";if(o.flashNode=o.flashWrapper.lastChild,o.hide=function(){i=!1,T&&(o.flashNode.style.display="none")},o.show=function(){i=!0,T&&(o.flashNode.style.display="")},o.setSize=function(e,t){o.flashNode.style.width=e+"px",o.flashNode.style.height=t+"px",null!==o.flashApi&&"function"==typeof o.flashApi.fire_setSize&&o.flashApi.fire_setSize(e,t)},o.destroy=function(){o.flashNode.remove()},n&&n.length>0)for(var A=0,L=n.length;A<L;A++)if(d.renderer.renderers[t.prefix].canPlayType(n[A].type)){o.setSrc(n[A].src);break}return o}};if(p.hasPluginVersion("flash",[10,0,0])){f.typeChecks.push(function(e){return(e=e.toLowerCase()).startsWith("rtmp")?~e.indexOf(".mp3")?"audio/rtmp":"video/rtmp":/\.og(a|g)/i.test(e)?"audio/ogg":~e.indexOf(".m3u8")?"application/x-mpegURL":~e.indexOf(".mpd")?"application/dash+xml":~e.indexOf(".flv")?"video/flv":null});var h={name:"flash_video",options:{prefix:"flash_video",filename:"mediaelement-flash-video.swf",enablePseudoStreaming:!1,pseudoStreamingStartQueryParam:"start",pseudoStreamingType:"byte",proxyType:"",streamDelimiter:""},canPlayType:function(e){return~["video/mp4","video/rtmp","audio/rtmp","rtmp/mp4","audio/mp4","video/flv","video/x-flv"].indexOf(e.toLowerCase())},create:m.create};d.renderer.add(h);var v={name:"flash_hls",options:{prefix:"flash_hls",filename:"mediaelement-flash-video-hls.swf"},canPlayType:function(e){return~["application/x-mpegurl","application/vnd.apple.mpegurl","audio/mpegurl","audio/hls","video/hls"].indexOf(e.toLowerCase())},create:m.create};d.renderer.add(v);var g={name:"flash_dash",options:{prefix:"flash_dash",filename:"mediaelement-flash-video-mdash.swf"},canPlayType:function(e){return~["application/dash+xml"].indexOf(e.toLowerCase())},create:m.create};d.renderer.add(g);var y={name:"flash_audio",options:{prefix:"flash_audio",filename:"mediaelement-flash-audio.swf"},canPlayType:function(e){return~["audio/mp3"].indexOf(e.toLowerCase())},create:m.create};d.renderer.add(y);var E={name:"flash_audio_ogg",options:{prefix:"flash_audio_ogg",filename:"mediaelement-flash-audio-ogg.swf"},canPlayType:function(e){return~["audio/ogg","audio/oga","audio/ogv"].indexOf(e.toLowerCase())},create:m.create};d.renderer.add(E)}},{2:2,25:25,27:27,28:28,3:3,5:5,7:7,8:8}],21:[function(e,t,n){"use strict";function o(e){return e&&e.__esModule?e:{default:e}}var i="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e},r=o(e(3)),a=o(e(7)),s=e(8),l=e(27),d=e(25),u=e(28),c=e(26),f={promise:null,load:function(e){return"undefined"!=typeof flvjs?f.promise=new Promise(function(e){e()}).then(function(){f._createPlayer(e)}):(e.options.path="string"==typeof e.options.path?e.options.path:"https://cdnjs.cloudflare.com/ajax/libs/flv.js/1.3.3/flv.min.js",f.promise=f.promise||(0,c.loadScript)(e.options.path),f.promise.then(function(){f._createPlayer(e)})),f.promise},_createPlayer:function(e){flvjs.LoggingControl.enableDebug=e.options.debug,flvjs.LoggingControl.enableVerbose=e.options.debug;var t=flvjs.createPlayer(e.options,e.configs);return r.default["__ready__"+e.id](t),t}},p={name:"native_flv",options:{prefix:"native_flv",flv:{path:"https://cdnjs.cloudflare.com/ajax/libs/flv.js/1.3.3/flv.min.js",cors:!0,debug:!1}},canPlayType:function(e){return d.HAS_MSE&&["video/x-flv","video/flv"].indexOf(e.toLowerCase())>-1},create:function(e,t,n){var o=e.originalNode,d=e.id+"_"+t.prefix,u=null,c=null;u=o.cloneNode(!0),t=Object.assign(t,e.options);for(var p=a.default.html5media.properties,m=a.default.html5media.events.concat(["click","mouseover","mouseout"]),h=function(t){if("error"!==t.type){var n=(0,l.createEvent)(t.type,e);e.dispatchEvent(n)}},v=0,g=p.length;v<g;v++)!function(e){var n=""+e.substring(0,1).toUpperCase()+e.substring(1);u["get"+n]=function(){return null!==c?u[e]:null},u["set"+n]=function(n){if(-1===a.default.html5media.readOnlyProperties.indexOf(e))if("src"===e){if(u[e]="object"===(void 0===n?"undefined":i(n))&&n.src?n.src:n,null!==c){var o={};o.type="flv",o.url=n,o.cors=t.flv.cors,o.debug=t.flv.debug,o.path=t.flv.path;var r=t.flv.configs;c.destroy();for(var s=0,l=m.length;s<l;s++)u.removeEventListener(m[s],h);(c=f._createPlayer({options:o,configs:r,id:d})).attachMediaElement(u),c.load()}}else u[e]=n}}(p[v]);if(r.default["__ready__"+d]=function(t){e.flvPlayer=c=t;for(var n=flvjs.Events,o=0,i=m.length;o<i;o++)!function(e){"loadedmetadata"===e&&(c.unload(),c.detachMediaElement(),c.attachMediaElement(u),c.load()),u.addEventListener(e,h)}(m[o]);var r=function(t,n){if("error"===t){var o=n[0]+": "+n[1]+" "+n[2].msg;e.generateError(o,u.src)}else{var i=(0,l.createEvent)(t,e);i.data=n,e.dispatchEvent(i)}};for(var a in n)!function(e){n.hasOwnProperty(e)&&c.on(n[e],function(){for(var t=arguments.length,o=Array(t),i=0;i<t;i++)o[i]=arguments[i];return r(n[e],o)})}(a)},n&&n.length>0)for(var y=0,E=n.length;y<E;y++)if(s.renderer.renderers[t.prefix].canPlayType(n[y].type)){u.setAttribute("src",n[y].src);break}u.setAttribute("id",d),o.parentNode.insertBefore(u,o),o.autoplay=!1,o.style.display="none";var b={};b.type="flv",b.url=u.src,b.cors=t.flv.cors,b.debug=t.flv.debug,b.path=t.flv.path;var S=t.flv.configs;u.setSize=function(e,t){return u.style.width=e+"px",u.style.height=t+"px",u},u.hide=function(){return null!==c&&c.pause(),u.style.display="none",u},u.show=function(){return u.style.display="",u},u.destroy=function(){null!==c&&c.destroy()};var x=(0,l.createEvent)("rendererready",u);return e.dispatchEvent(x),e.promises.push(f.load({options:b,configs:S,id:d})),u}};u.typeChecks.push(function(e){return~e.toLowerCase().indexOf(".flv")?"video/flv":null}),s.renderer.add(p)},{25:25,26:26,27:27,28:28,3:3,7:7,8:8}],22:[function(e,t,n){"use strict";function o(e){return e&&e.__esModule?e:{default:e}}var i="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e},r=o(e(3)),a=o(e(7)),s=e(8),l=e(27),d=e(25),u=e(28),c=e(26),f={promise:null,load:function(e){return"undefined"!=typeof Hls?f.promise=new Promise(function(e){e()}).then(function(){f._createPlayer(e)}):(e.options.path="string"==typeof e.options.path?e.options.path:"https://cdnjs.cloudflare.com/ajax/libs/hls.js/0.8.4/hls.min.js",f.promise=f.promise||(0,c.loadScript)(e.options.path),f.promise.then(function(){f._createPlayer(e)})),f.promise},_createPlayer:function(e){var t=new Hls(e.options);return r.default["__ready__"+e.id](t),t}},p={name:"native_hls",options:{prefix:"native_hls",hls:{path:"https://cdnjs.cloudflare.com/ajax/libs/hls.js/0.8.4/hls.min.js",autoStartLoad:!1,debug:!1}},canPlayType:function(e){return d.HAS_MSE&&["application/x-mpegurl","application/vnd.apple.mpegurl","audio/mpegurl","audio/hls","video/hls"].indexOf(e.toLowerCase())>-1},create:function(e,t,n){var o=e.originalNode,d=e.id+"_"+t.prefix,u=o.getAttribute("preload"),c=o.autoplay,p=null,m=null,h=0,v=n.length;m=o.cloneNode(!0),(t=Object.assign(t,e.options)).hls.autoStartLoad=u&&"none"!==u||c;for(var g=a.default.html5media.properties,y=a.default.html5media.events.concat(["click","mouseover","mouseout"]),E=function(t){if("error"!==t.type){var n=(0,l.createEvent)(t.type,e);e.dispatchEvent(n)}},b=0,S=g.length;b<S;b++)!function(e){var n=""+e.substring(0,1).toUpperCase()+e.substring(1);m["get"+n]=function(){return null!==p?m[e]:null},m["set"+n]=function(n){if(-1===a.default.html5media.readOnlyProperties.indexOf(e))if("src"===e){if(m[e]="object"===(void 0===n?"undefined":i(n))&&n.src?n.src:n,null!==p){p.destroy();for(var o=0,r=y.length;o<r;o++)m.removeEventListener(y[o],E);(p=f._createPlayer({options:t.hls,id:d})).loadSource(n),p.attachMedia(m)}}else m[e]=n}}(g[b]);if(r.default["__ready__"+d]=function(t){e.hlsPlayer=p=t;for(var o=Hls.Events,i=0,r=y.length;i<r;i++)!function(t){if("loadedmetadata"===t){var n=e.originalNode.src;p.detachMedia(),p.loadSource(n),p.attachMedia(m)}m.addEventListener(t,E)}(y[i]);var a=void 0,s=void 0,d=function(t,o){if("hlsError"===t){if(console.warn(o),(o=o[1]).fatal)switch(o.type){case"mediaError":var i=(new Date).getTime();if(!a||i-a>3e3)a=(new Date).getTime(),p.recoverMediaError();else if(!s||i-s>3e3)s=(new Date).getTime(),console.warn("Attempting to swap Audio Codec and recover from media error"),p.swapAudioCodec(),p.recoverMediaError();else{var r="Cannot recover, last media error recovery failed";e.generateError(r,m.src),console.error(r)}break;case"networkError":if("manifestLoadError"===o.details)if(h<v&&void 0!==n[h+1])m.setSrc(n[h++].src),m.load(),m.play();else{e.generateError("Network error",n),console.error("Network error")}else{e.generateError("Network error",n),console.error("Network error")}break;default:p.destroy()}}else{var d=(0,l.createEvent)(t,e);d.data=o,e.dispatchEvent(d)}};for(var u in o)!function(e){o.hasOwnProperty(e)&&p.on(o[e],function(){for(var t=arguments.length,n=Array(t),i=0;i<t;i++)n[i]=arguments[i];return d(o[e],n)})}(u)},v>0)for(;h<v;h++)if(s.renderer.renderers[t.prefix].canPlayType(n[h].type)){m.setAttribute("src",n[h].src);break}"auto"===u||c||(m.addEventListener("play",function(){null!==p&&p.startLoad()}),m.addEventListener("pause",function(){null!==p&&p.stopLoad()})),m.setAttribute("id",d),o.parentNode.insertBefore(m,o),o.autoplay=!1,o.style.display="none",m.setSize=function(e,t){return m.style.width=e+"px",m.style.height=t+"px",m},m.hide=function(){return m.pause(),m.style.display="none",m},m.show=function(){return m.style.display="",m},m.destroy=function(){null!==p&&(p.stopLoad(),p.destroy())};var x=(0,l.createEvent)("rendererready",m);return e.dispatchEvent(x),e.promises.push(f.load({options:t.hls,id:d})),m}};u.typeChecks.push(function(e){return~e.toLowerCase().indexOf(".m3u8")?"application/x-mpegURL":null}),s.renderer.add(p)},{25:25,26:26,27:27,28:28,3:3,7:7,8:8}],23:[function(e,t,n){"use strict";function o(e){return e&&e.__esModule?e:{default:e}}var i=o(e(3)),r=o(e(2)),a=o(e(7)),s=e(8),l=e(27),d=e(25),u={name:"html5",options:{prefix:"html5"},canPlayType:function(e){var t=r.default.createElement("video");return d.IS_ANDROID&&/\/mp(3|4)$/i.test(e)||~["application/x-mpegurl","vnd.apple.mpegurl","audio/mpegurl","audio/hls","video/hls"].indexOf(e.toLowerCase())&&d.SUPPORTS_NATIVE_HLS?"yes":t.canPlayType?t.canPlayType(e.toLowerCase()).replace(/no/,""):""},create:function(e,t,n){var o=e.id+"_"+t.prefix,i=!1,d=null;void 0===e.originalNode||null===e.originalNode?(d=r.default.createElement("audio"),e.appendChild(d)):d=e.originalNode,d.setAttribute("id",o);for(var u=a.default.html5media.properties,c=0,f=u.length;c<f;c++)!function(e){var t=""+e.substring(0,1).toUpperCase()+e.substring(1);d["get"+t]=function(){return d[e]},d["set"+t]=function(t){-1===a.default.html5media.readOnlyProperties.indexOf(e)&&(d[e]=t)}}(u[c]);for(var p=a.default.html5media.events.concat(["click","mouseover","mouseout"]),m=0,h=p.length;m<h;m++)!function(t){d.addEventListener(t,function(t){if(i){var n=(0,l.createEvent)(t.type,t.target);e.dispatchEvent(n)}})}(p[m]);d.setSize=function(e,t){return d.style.width=e+"px",d.style.height=t+"px",d},d.hide=function(){return i=!1,d.style.display="none",d},d.show=function(){return i=!0,d.style.display="",d};var v=0,g=n.length;if(g>0)for(;v<g;v++)if(s.renderer.renderers[t.prefix].canPlayType(n[v].type)){d.setAttribute("src",n[v].src);break}d.addEventListener("error",function(t){4===t.target.error.code&&i&&(v<g&&void 0!==n[v+1]?(d.src=n[v++].src,d.load(),d.play()):e.generateError("Media error: Format(s) not supported or source(s) not found",n))});var y=(0,l.createEvent)("rendererready",d);return e.dispatchEvent(y),d}};i.default.HtmlMediaElement=a.default.HtmlMediaElement=u,s.renderer.add(u)},{2:2,25:25,27:27,3:3,7:7,8:8}],24:[function(e,t,n){"use strict";function o(e){return e&&e.__esModule?e:{default:e}}var i=o(e(3)),r=o(e(2)),a=o(e(7)),s=e(8),l=e(27),d=e(28),u=e(26),c={isIframeStarted:!1,isIframeLoaded:!1,iframeQueue:[],enqueueIframe:function(e){c.isLoaded="undefined"!=typeof YT&&YT.loaded,c.isLoaded?c.createIframe(e):(c.loadIframeApi(),c.iframeQueue.push(e))},loadIframeApi:function(){c.isIframeStarted||((0,u.loadScript)("https://www.youtube.com/player_api"),c.isIframeStarted=!0)},iFrameReady:function(){for(c.isLoaded=!0,c.isIframeLoaded=!0;c.iframeQueue.length>0;){var e=c.iframeQueue.pop();c.createIframe(e)}},createIframe:function(e){return new YT.Player(e.containerId,e)},getYouTubeId:function(e){var t="";return e.indexOf("?")>0?""===(t=c.getYouTubeIdFromParam(e))&&(t=c.getYouTubeIdFromUrl(e)):t=c.getYouTubeIdFromUrl(e),(t=t.substring(t.lastIndexOf("/")+1).split("?"))[0]},getYouTubeIdFromParam:function(e){if(void 0===e||null===e||!e.trim().length)return null;for(var t=e.split("?")[1].split("&"),n="",o=0,i=t.length;o<i;o++){var r=t[o].split("=");if("v"===r[0]){n=r[1];break}}return n},getYouTubeIdFromUrl:function(e){return void 0!==e&&null!==e&&e.trim().length?(e=e.split("?")[0]).substring(e.lastIndexOf("/")+1):null},getYouTubeNoCookieUrl:function(e){if(void 0===e||null===e||!e.trim().length||-1===e.indexOf("//www.youtube"))return e;var t=e.split("/");return t[2]=t[2].replace(".com","-nocookie.com"),t.join("/")}},f={name:"youtube_iframe",options:{prefix:"youtube_iframe",youtube:{autoplay:0,controls:0,disablekb:1,end:0,loop:0,modestbranding:0,playsinline:0,rel:0,showinfo:0,start:0,iv_load_policy:3,nocookie:!1,imageQuality:null}},canPlayType:function(e){return~["video/youtube","video/x-youtube"].indexOf(e.toLowerCase())},create:function(e,t,n){var o={},s=[],d=null,u=!0,f=!1,p=null,m=1;o.options=t,o.id=e.id+"_"+t.prefix,o.mediaElement=e;for(var h=a.default.html5media.properties,v=0,g=h.length;v<g;v++)!function(t){var n=""+t.substring(0,1).toUpperCase()+t.substring(1);o["get"+n]=function(){if(null!==d){switch(t){case"currentTime":return d.getCurrentTime();case"duration":return d.getDuration();case"volume":return m=d.getVolume()/100;case"paused":return u;case"ended":return f;case"muted":return d.isMuted();case"buffered":var e=d.getVideoLoadedFraction(),n=d.getDuration();return{start:function(){return 0},end:function(){return e*n},length:1};case"src":return d.getVideoUrl();case"readyState":return 4}return null}return null},o["set"+n]=function(n){if(null!==d)switch(t){case"src":var i="string"==typeof n?n:n[0].src,r=c.getYouTubeId(i);e.originalNode.autoplay?d.loadVideoById(r):d.cueVideoById(r);break;case"currentTime":d.seekTo(n);break;case"muted":n?d.mute():d.unMute(),setTimeout(function(){var t=(0,l.createEvent)("volumechange",o);e.dispatchEvent(t)},50);break;case"volume":m=n,d.setVolume(100*n),setTimeout(function(){var t=(0,l.createEvent)("volumechange",o);e.dispatchEvent(t)},50);break;case"readyState":var a=(0,l.createEvent)("canplay",o);e.dispatchEvent(a)}else s.push({type:"set",propName:t,value:n})}}(h[v]);for(var y=a.default.html5media.methods,E=0,b=y.length;E<b;E++)!function(e){o[e]=function(){if(null!==d)switch(e){case"play":return u=!1,d.playVideo();case"pause":return u=!0,d.pauseVideo();case"load":return null}else s.push({type:"call",methodName:e})}}(y[E]);var S=r.default.createElement("div");S.id=o.id,o.options.youtube.nocookie&&(e.originalNode.src=c.getYouTubeNoCookieUrl(n[0].src)),e.originalNode.parentNode.insertBefore(S,e.originalNode),e.originalNode.style.display="none";var x="audio"===e.originalNode.tagName.toLowerCase(),w=x?"1":e.originalNode.height,P=x?"1":e.originalNode.width,T=c.getYouTubeId(n[0].src),C={id:o.id,containerId:S.id,videoId:T,height:w,width:P,playerVars:Object.assign({controls:0,rel:0,disablekb:1,showinfo:0,modestbranding:0,html5:1,iv_load_policy:3},o.options.youtube),origin:i.default.location.host,events:{onReady:function(t){if(e.youTubeApi=d=t.target,e.youTubeState={paused:!0,ended:!1},s.length)for(var n=0,i=s.length;n<i;n++){var r=s[n];if("set"===r.type){var a=r.propName,u=""+a.substring(0,1).toUpperCase()+a.substring(1);o["set"+u](r.value)}else"call"===r.type&&o[r.methodName]()}p=d.getIframe(),e.originalNode.muted&&d.mute();for(var c=["mouseover","mouseout"],f=0,m=c.length;f<m;f++)p.addEventListener(c[f],function(t){var n=(0,l.createEvent)(t.type,o);e.dispatchEvent(n)},!1);for(var h=["rendererready","loadedmetadata","loadeddata","canplay"],v=0,g=h.length;v<g;v++){var y=(0,l.createEvent)(h[v],o);e.dispatchEvent(y)}},onStateChange:function(t){var n=[];switch(t.data){case-1:n=["loadedmetadata"],u=!0,f=!1;break;case 0:n=["ended"],u=!1,f=!o.options.youtube.loop,o.options.youtube.loop||o.stopInterval();break;case 1:n=["play","playing"],u=!1,f=!1,o.startInterval();break;case 2:n=["pause"],u=!0,f=!1,o.stopInterval();break;case 3:n=["progress"],f=!1;break;case 5:n=["loadeddata","loadedmetadata","canplay"],u=!0,f=!1}for(var i=0,r=n.length;i<r;i++){var a=(0,l.createEvent)(n[i],o);e.dispatchEvent(a)}},onError:function(t){var n=(0,l.createEvent)("error",o);n.data=t.data,e.dispatchEvent(n)}}};return(x||e.originalNode.hasAttribute("playsinline"))&&(C.playerVars.playsinline=1),e.originalNode.controls&&(C.playerVars.controls=1),e.originalNode.autoplay&&(C.playerVars.autoplay=1),e.originalNode.loop&&(C.playerVars.loop=1),c.enqueueIframe(C),o.onEvent=function(t,n,o){null!==o&&void 0!==o&&(e.youTubeState=o)},o.setSize=function(e,t){null!==d&&d.setSize(e,t)},o.hide=function(){o.stopInterval(),o.pause(),p&&(p.style.display="none")},o.show=function(){p&&(p.style.display="")},o.destroy=function(){d.destroy()},o.interval=null,o.startInterval=function(){o.interval=setInterval(function(){var t=(0,l.createEvent)("timeupdate",o);e.dispatchEvent(t)},250)},o.stopInterval=function(){o.interval&&clearInterval(o.interval)},o.getPosterUrl=function(){var n=t.youtube.imageQuality,o=["default","hqdefault","mqdefault","sddefault","maxresdefault"],i=c.getYouTubeId(e.originalNode.src);return n&&o.indexOf(n)>-1&&i?"https://img.youtube.com/vi/"+i+"/"+n+".jpg":""},o}};i.default.onYouTubePlayerAPIReady=function(){c.iFrameReady()},d.typeChecks.push(function(e){return/\/\/(www\.youtube|youtu\.?be)/i.test(e)?"video/x-youtube":null}),s.renderer.add(f)},{2:2,26:26,27:27,28:28,3:3,7:7,8:8}],25:[function(e,t,n){"use strict";function o(e){return e&&e.__esModule?e:{default:e}}Object.defineProperty(n,"__esModule",{value:!0}),n.cancelFullScreen=n.requestFullScreen=n.isFullScreen=n.FULLSCREEN_EVENT_NAME=n.HAS_NATIVE_FULLSCREEN_ENABLED=n.HAS_TRUE_NATIVE_FULLSCREEN=n.HAS_IOS_FULLSCREEN=n.HAS_MS_NATIVE_FULLSCREEN=n.HAS_MOZ_NATIVE_FULLSCREEN=n.HAS_WEBKIT_NATIVE_FULLSCREEN=n.HAS_NATIVE_FULLSCREEN=n.SUPPORTS_NATIVE_HLS=n.SUPPORT_PASSIVE_EVENT=n.SUPPORT_POINTER_EVENTS=n.HAS_MSE=n.IS_STOCK_ANDROID=n.IS_SAFARI=n.IS_FIREFOX=n.IS_CHROME=n.IS_EDGE=n.IS_IE=n.IS_ANDROID=n.IS_IOS=n.IS_IPOD=n.IS_IPHONE=n.IS_IPAD=n.UA=n.NAV=void 0;for(var i=o(e(3)),r=o(e(2)),a=o(e(7)),s=n.NAV=i.default.navigator,l=n.UA=s.userAgent.toLowerCase(),d=n.IS_IPAD=/ipad/i.test(l)&&!i.default.MSStream,u=n.IS_IPHONE=/iphone/i.test(l)&&!i.default.MSStream,c=n.IS_IPOD=/ipod/i.test(l)&&!i.default.MSStream,f=(n.IS_IOS=/ipad|iphone|ipod/i.test(l)&&!i.default.MSStream,n.IS_ANDROID=/android/i.test(l)),p=n.IS_IE=/(trident|microsoft)/i.test(s.appName),m=(n.IS_EDGE="msLaunchUri"in s&&!("documentMode"in r.default)),h=n.IS_CHROME=/chrome/i.test(l),v=n.IS_FIREFOX=/firefox/i.test(l),g=n.IS_SAFARI=/safari/i.test(l)&&!h,y=n.IS_STOCK_ANDROID=/^mozilla\/\d+\.\d+\s\(linux;\su;/i.test(l),E=(n.HAS_MSE="MediaSource"in i.default),b=n.SUPPORT_POINTER_EVENTS=function(){var e=r.default.createElement("x"),t=r.default.documentElement,n=i.default.getComputedStyle;if(!("pointerEvents"in e.style))return!1;e.style.pointerEvents="auto",e.style.pointerEvents="x",t.appendChild(e);var o=n&&"auto"===n(e,"").pointerEvents;return e.remove(),!!o}(),S=n.SUPPORT_PASSIVE_EVENT=function(){var e=!1;try{var t=Object.defineProperty({},"passive",{get:function(){e=!0}});i.default.addEventListener("test",null,t)}catch(e){}return e}(),x=["source","track","audio","video"],w=void 0,P=0,T=x.length;P<T;P++)w=r.default.createElement(x[P]);var C=n.SUPPORTS_NATIVE_HLS=g||f&&(h||y)||p&&/edge/i.test(l),k=void 0!==w.webkitEnterFullscreen,_=void 0!==w.requestFullscreen;k&&/mac os x 10_5/i.test(l)&&(_=!1,k=!1);var N=void 0!==w.webkitRequestFullScreen,A=void 0!==w.mozRequestFullScreen,L=void 0!==w.msRequestFullscreen,F=N||A||L,j=F,I="",M=void 0,O=void 0,D=void 0;A?j=r.default.mozFullScreenEnabled:L&&(j=r.default.msFullscreenEnabled),h&&(k=!1),F&&(N?I="webkitfullscreenchange":A?I="mozfullscreenchange":L&&(I="MSFullscreenChange"),n.isFullScreen=M=function(){return A?r.default.mozFullScreen:N?r.default.webkitIsFullScreen:L?null!==r.default.msFullscreenElement:void 0},n.requestFullScreen=O=function(e){N?e.webkitRequestFullScreen():A?e.mozRequestFullScreen():L&&e.msRequestFullscreen()},n.cancelFullScreen=D=function(){N?r.default.webkitCancelFullScreen():A?r.default.mozCancelFullScreen():L&&r.default.msExitFullscreen()});var R=n.HAS_NATIVE_FULLSCREEN=_,V=n.HAS_WEBKIT_NATIVE_FULLSCREEN=N,H=n.HAS_MOZ_NATIVE_FULLSCREEN=A,U=n.HAS_MS_NATIVE_FULLSCREEN=L,q=n.HAS_IOS_FULLSCREEN=k,B=n.HAS_TRUE_NATIVE_FULLSCREEN=F,z=n.HAS_NATIVE_FULLSCREEN_ENABLED=j,W=n.FULLSCREEN_EVENT_NAME=I;n.isFullScreen=M,n.requestFullScreen=O,n.cancelFullScreen=D,a.default.Features=a.default.Features||{},a.default.Features.isiPad=d,a.default.Features.isiPod=c,a.default.Features.isiPhone=u,a.default.Features.isiOS=a.default.Features.isiPhone||a.default.Features.isiPad,a.default.Features.isAndroid=f,a.default.Features.isIE=p,a.default.Features.isEdge=m,a.default.Features.isChrome=h,a.default.Features.isFirefox=v,a.default.Features.isSafari=g,a.default.Features.isStockAndroid=y,a.default.Features.hasMSE=E,a.default.Features.supportsNativeHLS=C,a.default.Features.supportsPointerEvents=b,a.default.Features.supportsPassiveEvent=S,a.default.Features.hasiOSFullScreen=q,a.default.Features.hasNativeFullscreen=R,a.default.Features.hasWebkitNativeFullScreen=V,a.default.Features.hasMozNativeFullScreen=H,a.default.Features.hasMsNativeFullScreen=U,a.default.Features.hasTrueNativeFullScreen=B,a.default.Features.nativeFullScreenEnabled=z,a.default.Features.fullScreenEventName=W,a.default.Features.isFullScreen=M,a.default.Features.requestFullScreen=O,a.default.Features.cancelFullScreen=D},{2:2,3:3,7:7}],26:[function(e,t,n){"use strict";function o(e){return e&&e.__esModule?e:{default:e}}function i(e){return new Promise(function(t,n){var o=p.default.createElement("script");o.src=e,o.async=!0,o.onload=function(){o.remove(),t()},o.onerror=function(){o.remove(),n()},p.default.head.appendChild(o)})}function r(e){var t=e.getBoundingClientRect(),n=f.default.pageXOffset||p.default.documentElement.scrollLeft,o=f.default.pageYOffset||p.default.documentElement.scrollTop;return{top:t.top+o,left:t.left+n}}function a(e,t){y(e,t)?b(e,t):E(e,t)}function s(e){var t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:400,n=arguments[2];e.style.opacity||(e.style.opacity=1);var o=null;f.default.requestAnimationFrame(function i(r){var a=r-(o=o||r),s=parseFloat(1-a/t,2);e.style.opacity=s<0?0:s,a>t?n&&"function"==typeof n&&n():f.default.requestAnimationFrame(i)})}function l(e){var t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:400,n=arguments[2];e.style.opacity||(e.style.opacity=0);var o=null;f.default.requestAnimationFrame(function i(r){var a=r-(o=o||r),s=parseFloat(a/t,2);e.style.opacity=s>1?1:s,a>t?n&&"function"==typeof n&&n():f.default.requestAnimationFrame(i)})}function d(e,t){var n=[];e=e.parentNode.firstChild;do{t&&!t(e)||n.push(e)}while(e=e.nextSibling);return n}function u(e){return void 0!==e.getClientRects&&"function"===e.getClientRects?!!(e.offsetWidth||e.offsetHeight||e.getClientRects().length):!(!e.offsetWidth&&!e.offsetHeight)}function c(e,t,n,o){var i=f.default.XMLHttpRequest?new XMLHttpRequest:new ActiveXObject("Microsoft.XMLHTTP"),r="application/x-www-form-urlencoded; charset=UTF-8",a=!1,s="*/".concat("*");switch(t){case"text":r="text/plain";break;case"json":r="application/json, text/javascript";break;case"html":r="text/html";break;case"xml":r="application/xml, text/xml"}"application/x-www-form-urlencoded"!==r&&(s=r+", */*; q=0.01"),i&&(i.open("GET",e,!0),i.setRequestHeader("Accept",s),i.onreadystatechange=function(){if(!a&&4===i.readyState)if(200===i.status){a=!0;var e=void 0;switch(t){case"json":e=JSON.parse(i.responseText);break;case"xml":e=i.responseXML;break;default:e=i.responseText}n(e)}else"function"==typeof o&&o(i.status)},i.send())}Object.defineProperty(n,"__esModule",{value:!0}),n.removeClass=n.addClass=n.hasClass=void 0,n.loadScript=i,n.offset=r,n.toggleClass=a,n.fadeOut=s,n.fadeIn=l,n.siblings=d,n.visible=u,n.ajax=c;var f=o(e(3)),p=o(e(2)),m=o(e(7)),h=void 0,v=void 0,g=void 0;"classList"in p.default.documentElement?(h=function(e,t){return void 0!==e.classList&&e.classList.contains(t)},v=function(e,t){return e.classList.add(t)},g=function(e,t){return e.classList.remove(t)}):(h=function(e,t){return new RegExp("\\b"+t+"\\b").test(e.className)},v=function(e,t){y(e,t)||(e.className+=" "+t)},g=function(e,t){e.className=e.className.replace(new RegExp("\\b"+t+"\\b","g"),"")});var y=n.hasClass=h,E=n.addClass=v,b=n.removeClass=g;m.default.Utils=m.default.Utils||{},m.default.Utils.offset=r,m.default.Utils.hasClass=y,m.default.Utils.addClass=E,m.default.Utils.removeClass=b,m.default.Utils.toggleClass=a,m.default.Utils.fadeIn=l,m.default.Utils.fadeOut=s,m.default.Utils.siblings=d,m.default.Utils.visible=u,m.default.Utils.ajax=c,m.default.Utils.loadScript=i},{2:2,3:3,7:7}],27:[function(e,t,n){"use strict";function o(e){if("string"!=typeof e)throw new Error("Argument passed must be a string");var t={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"};return e.replace(/[&<>"]/g,function(e){return t[e]})}function i(e,t){var n=this,o=arguments,i=arguments.length>2&&void 0!==arguments[2]&&arguments[2];if("function"!=typeof e)throw new Error("First argument must be a function");if("number"!=typeof t)throw new Error("Second argument must be a numeric value");var r=void 0;return function(){var a=n,s=o,l=i&&!r;clearTimeout(r),r=setTimeout(function(){r=null,i||e.apply(a,s)},t),l&&e.apply(a,s)}}function r(e){return Object.getOwnPropertyNames(e).length<=0}function a(e,t){var n=/^((after|before)print|(before)?unload|hashchange|message|o(ff|n)line|page(hide|show)|popstate|resize|storage)\b/,o={d:[],w:[]};return(e||"").split(" ").forEach(function(e){var i=e+(t?"."+t:"");i.startsWith(".")?(o.d.push(i),o.w.push(i)):o[n.test(e)?"w":"d"].push(i)}),o.d=o.d.join(" "),o.w=o.w.join(" "),o}function s(e,t){if("string"!=typeof e)throw new Error("Event name must be a string");var n=e.match(/([a-z]+\.([a-z]+))/i),o={target:t};return null!==n&&(e=n[1],o.namespace=n[2]),new window.CustomEvent(e,{detail:o})}function l(e,t){return!!(e&&t&&2&e.compareDocumentPosition(t))}function d(e){return"string"==typeof e}Object.defineProperty(n,"__esModule",{value:!0}),n.escapeHTML=o,n.debounce=i,n.isObjectEmpty=r,n.splitEvents=a,n.createEvent=s,n.isNodeAfter=l,n.isString=d;var u=function(e){return e&&e.__esModule?e:{default:e}}(e(7));u.default.Utils=u.default.Utils||{},u.default.Utils.escapeHTML=o,u.default.Utils.debounce=i,u.default.Utils.isObjectEmpty=r,u.default.Utils.splitEvents=a,u.default.Utils.createEvent=s,u.default.Utils.isNodeAfter=l,u.default.Utils.isString=d},{7:7}],28:[function(e,t,n){"use strict";function o(e){if("string"!=typeof e)throw new Error("`url` argument must be a string");var t=document.createElement("div");return t.innerHTML='<a href="'+(0,u.escapeHTML)(e)+'">x</a>',t.firstChild.href}function i(e){var t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:"";return e&&!t?a(e):t}function r(e){if("string"!=typeof e)throw new Error("`type` argument must be a string");return e&&e.indexOf(";")>-1?e.substr(0,e.indexOf(";")):e}function a(e){if("string"!=typeof e)throw new Error("`url` argument must be a string");for(var t=0,n=c.length;t<n;t++){var o=c[t](e);if(o)return o}var i=l(s(e)),r="video/mp4";return i&&(~["mp4","m4v","ogg","ogv","webm","flv","mpeg","mov"].indexOf(i)?r="video/"+i:~["mp3","oga","wav","mid","midi"].indexOf(i)&&(r="audio/"+i)),r}function s(e){if("string"!=typeof e)throw new Error("`url` argument must be a string");var t=e.split("?")[0].split("\\").pop().split("/").pop();return~t.indexOf(".")?t.substring(t.lastIndexOf(".")+1):""}function l(e){if("string"!=typeof e)throw new Error("`extension` argument must be a string");switch(e){case"mp4":case"m4v":return"mp4";case"webm":case"webma":case"webmv":return"webm";case"ogg":case"oga":case"ogv":return"ogg";default:return e}}Object.defineProperty(n,"__esModule",{value:!0}),n.typeChecks=void 0,n.absolutizeUrl=o,n.formatType=i,n.getMimeFromType=r,n.getTypeFromFile=a,n.getExtension=s,n.normalizeExtension=l;var d=function(e){return e&&e.__esModule?e:{default:e}}(e(7)),u=e(27),c=n.typeChecks=[];d.default.Utils=d.default.Utils||{},d.default.Utils.typeChecks=c,d.default.Utils.absolutizeUrl=o,d.default.Utils.formatType=i,d.default.Utils.getMimeFromType=r,d.default.Utils.getTypeFromFile=a,d.default.Utils.getExtension=s,d.default.Utils.normalizeExtension=l},{27:27,7:7}],29:[function(e,t,n){"use strict";function o(e){return e&&e.__esModule?e:{default:e}}var i=o(e(2)),r=o(e(4));if([Element.prototype,CharacterData.prototype,DocumentType.prototype].forEach(function(e){e.hasOwnProperty("remove")||Object.defineProperty(e,"remove",{configurable:!0,enumerable:!0,writable:!0,value:function(){this.parentNode.removeChild(this)}})}),function(){function e(e,t){t=t||{bubbles:!1,cancelable:!1,detail:void 0};var n=i.default.createEvent("CustomEvent");return n.initCustomEvent(e,t.bubbles,t.cancelable,t.detail),n}if("function"==typeof window.CustomEvent)return!1;e.prototype=window.Event.prototype,window.CustomEvent=e}(),"function"!=typeof Object.assign&&(Object.assign=function(e){if(null===e||void 0===e)throw new TypeError("Cannot convert undefined or null to object");for(var t=Object(e),n=1,o=arguments.length;n<o;n++){var i=arguments[n];if(null!==i)for(var r in i)Object.prototype.hasOwnProperty.call(i,r)&&(t[r]=i[r])}return t}),String.prototype.startsWith||(String.prototype.startsWith=function(e,t){return t=t||0,this.substr(t,e.length)===e}),Element.prototype.matches||(Element.prototype.matches=Element.prototype.matchesSelector||Element.prototype.mozMatchesSelector||Element.prototype.msMatchesSelector||Element.prototype.oMatchesSelector||Element.prototype.webkitMatchesSelector||function(e){for(var t=(this.document||this.ownerDocument).querySelectorAll(e),n=t.length-1;--n>=0&&t.item(n)!==this;);return n>-1}),window.Element&&!Element.prototype.closest&&(Element.prototype.closest=function(e){var t=(this.document||this.ownerDocument).querySelectorAll(e),n=void 0,o=this;do{for(n=t.length;--n>=0&&t.item(n)!==o;);}while(n<0&&(o=o.parentElement));return o}),function(){for(var e=0,t=["ms","moz","webkit","o"],n=0;n<t.length&&!window.requestAnimationFrame;++n)window.requestAnimationFrame=window[t[n]+"RequestAnimationFrame"],window.cancelAnimationFrame=window[t[n]+"CancelAnimationFrame"]||window[t[n]+"CancelRequestAnimationFrame"];window.requestAnimationFrame||(window.requestAnimationFrame=function(t){var n=(new Date).getTime(),o=Math.max(0,16-(n-e)),i=window.setTimeout(function(){t(n+o)},o);return e=n+o,i}),window.cancelAnimationFrame||(window.cancelAnimationFrame=function(e){clearTimeout(e)})}(),/firefox/i.test(navigator.userAgent)){var a=window.getComputedStyle;window.getComputedStyle=function(e,t){var n=a(e,t);return null===n?{getPropertyValue:function(){}}:n}}window.Promise||(window.Promise=r.default),function(e){e&&e.prototype&&null===e.prototype.children&&Object.defineProperty(e.prototype,"children",{get:function(){for(var e=0,t=void 0,n=this.childNodes,o=[];t=n[e++];)1===t.nodeType&&o.push(t);return o}})}(window.Node||window.Element)},{2:2,4:4}],30:[function(e,t,n){"use strict";function o(){return!((arguments.length>0&&void 0!==arguments[0]?arguments[0]:25)%1==0)}function i(e){var t=arguments.length>1&&void 0!==arguments[1]&&arguments[1],n=arguments.length>2&&void 0!==arguments[2]&&arguments[2],i=arguments.length>3&&void 0!==arguments[3]?arguments[3]:25,r=arguments.length>4&&void 0!==arguments[4]?arguments[4]:0,a=arguments.length>5&&void 0!==arguments[5]?arguments[5]:"mm:ss";e=!e||"number"!=typeof e||e<0?0:e;var s=Math.round(.066666*i),l=Math.round(i),d=24*Math.round(3600*i),u=Math.round(600*i),c=o(i)?";":":",f=void 0,p=void 0,m=void 0,h=void 0,v=Math.round(e*i);if(o(i)){v<0&&(v=d+v);var g=(v%=d)%u;v+=9*s*Math.floor(v/u),g>s&&(v+=s*Math.floor((g-s)/Math.round(60*l-s)));var y=Math.floor(v/l);f=Math.floor(Math.floor(y/60)/60),p=Math.floor(y/60)%60,m=n?y%60:(v/l%60).toFixed(r)}else f=Math.floor(e/3600)%24,p=Math.floor(e/60)%60,m=n?Math.floor(e%60):(e%60).toFixed(r);f=f<=0?0:f,p=p<=0?0:p,m=m<=0?0:m;for(var E=a.split(":"),b={},S=0,x=E.length;S<x;++S){for(var w="",P=0,T=E[S].length;P<T;P++)w.indexOf(E[S][P])<0&&(w+=E[S][P]);~["f","s","m","h"].indexOf(w)&&(b[w]=E[S].length)}var C=t||f>0?(f<10&&b.h>1?"0"+f:f)+":":"";return C+=(p<10&&b.m>1?"0"+p:p)+":",C+=""+(m<10&&b.s>1?"0"+m:m),n&&(C+=(h=(h=(v%l).toFixed(0))<=0?0:h)<10&&b.f?c+"0"+h:""+c+h),C}function r(e){var t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:25;if("string"!=typeof e)throw new TypeError("Time must be a string");if(e.indexOf(";")>0&&(e=e.replace(";",":")),!/\d{2}(\:\d{2}){0,3}/i.test(e))throw new TypeError("Time code must have the format `00:00:00`");var n=e.split(":"),i=void 0,r=0,a=0,s=0,l=0,d=0,u=Math.round(.066666*t),c=Math.round(t),f=3600*c,p=60*c;switch(n.length){default:case 1:s=parseInt(n[0],10);break;case 2:a=parseInt(n[0],10),s=parseInt(n[1],10);break;case 3:r=parseInt(n[0],10),a=parseInt(n[1],10),s=parseInt(n[2],10);break;case 4:r=parseInt(n[0],10),a=parseInt(n[1],10),s=parseInt(n[2],10),l=parseInt(n[3],10)}return i=o(t)?f*r+p*a+c*s+l-u*((d=60*r+a)-Math.floor(d/10)):(f*r+p*a+t*s+l)/t,parseFloat(i.toFixed(3))}function a(e,t){var n=arguments.length>2&&void 0!==arguments[2]?arguments[2]:25;e=!e||"number"!=typeof e||e<0?0:e;for(var o=Math.floor(e/3600)%24,i=Math.floor(e/60)%60,r=Math.floor(e%60),a=[[Math.floor((e%1*n).toFixed(3)),"f"],[r,"s"],[i,"m"],[o,"h"]],s=t.timeFormat,l=s[1]===s[0],d=l?2:1,u=s.length<d?s[d]:":",c=s[0],f=!1,p=0,m=a.length;p<m;p++)if(~s.indexOf(a[p][1]))f=!0;else if(f){for(var h=!1,v=p;v<m;v++)if(a[v][0]>0){h=!0;break}if(!h)break;l||(s=c+s),s=a[p][1]+u+s,l&&(s=a[p][1]+s),c=a[p][1]}t.timeFormat=s}function s(e){if("string"!=typeof e)throw new TypeError("Argument must be a string value");for(var t=~(e=e.replace(",",".")).indexOf(".")?e.split(".")[1].length:0,n=0,o=1,i=0,r=(e=e.split(":").reverse()).length;i<r;i++)o=1,i>0&&(o=Math.pow(60,i)),n+=Number(e[i])*o;return Number(n.toFixed(t))}Object.defineProperty(n,"__esModule",{value:!0}),n.isDropFrame=o,n.secondsToTimeCode=i,n.timeCodeToSeconds=r,n.calculateTimeFormat=a,n.convertSMPTEtoSeconds=s;var l=function(e){return e&&e.__esModule?e:{default:e}}(e(7));l.default.Utils=l.default.Utils||{},l.default.Utils.secondsToTimeCode=i,l.default.Utils.timeCodeToSeconds=r,l.default.Utils.calculateTimeFormat=a,l.default.Utils.convertSMPTEtoSeconds=s},{7:7}]},{},[29,6,5,15,23,20,19,21,22,24,16,18,17,9,10,11,12,13,14]);;
!function(a,b){void 0===mejs.plugins&&(mejs.plugins={},mejs.plugins.silverlight=[],mejs.plugins.silverlight.push({types:[]})),mejs.HtmlMediaElementShim=mejs.HtmlMediaElementShim||{getTypeFromFile:mejs.Utils.getTypeFromFile},void 0===mejs.MediaFeatures&&(mejs.MediaFeatures=mejs.Features),void 0===mejs.Utility&&(mejs.Utility=mejs.Utils);var c=MediaElementPlayer.prototype.init;MediaElementPlayer.prototype.init=function(){this.options.classPrefix="mejs-",this.$media=this.$node=b(this.node),c.call(this)};var d=MediaElementPlayer.prototype._meReady;MediaElementPlayer.prototype._meReady=function(){this.container=b(this.container),this.controls=b(this.controls),this.layers=b(this.layers),d.apply(this,arguments)},MediaElementPlayer.prototype.getElement=function(a){return void 0!==b&&a instanceof b?a[0]:a},MediaElementPlayer.prototype.buildfeatures=function(a,c,d,e){for(var f=["playpause","current","progress","duration","tracks","volume","fullscreen"],g=0,h=this.options.features.length;g<h;g++){var i=this.options.features[g];if(this["build"+i])try{f.indexOf(i)===-1?this["build"+i](a,b(c),b(d),e):this["build"+i](a,c,d,e)}catch(j){console.error("error building "+i,j)}}}}(window,jQuery);;
!function(a,b){function c(){function a(){"undefined"!=typeof _wpmejsSettings&&(c=b.extend(!0,{},_wpmejsSettings)),c.classPrefix="mejs-",c.success=c.success||function(a){var b,c;a.rendererName&&-1!==a.rendererName.indexOf("flash")&&(b=a.attributes.autoplay&&"false"!==a.attributes.autoplay,c=a.attributes.loop&&"false"!==a.attributes.loop,b&&a.addEventListener("canplay",function(){a.play()},!1),c&&a.addEventListener("ended",function(){a.play()},!1))},c.customError=function(a,b){if(-1!==a.rendererName.indexOf("flash")||-1!==a.rendererName.indexOf("flv"))return'<a href="'+b.src+'">'+mejsL10n.strings["mejs.download-video"]+"</a>"},b(".wp-audio-shortcode, .wp-video-shortcode").not(".mejs-container").filter(function(){return!b(this).parent().hasClass("mejs-mediaelement")}).mediaelementplayer(c)}var c={};return{initialize:a}}a.wp=a.wp||{},a.wp.mediaelement=new c,b(a.wp.mediaelement.initialize)}(window,jQuery);;
/*!
 * MediaElement.js
 * http://www.mediaelementjs.com/
 *
 * Wrapper that mimics native HTML5 MediaElement (audio and video)
 * using a variety of technologies (pure JavaScript, Flash, iframe)
 *
 * Copyright 2010-2017, John Dyer (http://j.hn/)
 * License: MIT
 *
 */
!function e(t,n,r){function i(o,s){if(!n[o]){if(!t[o]){var c="function"==typeof require&&require;if(!s&&c)return c(o,!0);if(a)return a(o,!0);var u=new Error("Cannot find module '"+o+"'");throw u.code="MODULE_NOT_FOUND",u}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return i(n||e)},l,l.exports,e,t,n,r)}return n[o].exports}for(var a="function"==typeof require&&require,o=0;o<r.length;o++)i(r[o]);return i}({1:[function(e,t,n){"use strict";var r={promise:null,load:function(e){"undefined"!=typeof Vimeo?r._createPlayer(e):(r.promise=r.promise||mejs.Utils.loadScript("https://player.vimeo.com/api/player.js"),r.promise.then(function(){r._createPlayer(e)}))},_createPlayer:function(e){var t=new Vimeo.Player(e.iframe);window["__ready__"+e.id](t)},getVimeoId:function(e){return void 0===e||null===e?null:(e=e.split("?")[0],parseInt(e.substring(e.lastIndexOf("/")+1),10))}},i={name:"vimeo_iframe",options:{prefix:"vimeo_iframe"},canPlayType:function(e){return~["video/vimeo","video/x-vimeo"].indexOf(e.toLowerCase())},create:function(e,t,n){var i=[],a={},o=!0,s=1,c=s,u=0,l=0,d=!1,p=0,m=null,f="";a.options=t,a.id=e.id+"_"+t.prefix,a.mediaElement=e;for(var v=function(t,n){var r=mejs.Utils.createEvent("error",n);r.message=t.name+": "+t.message,e.dispatchEvent(r)},h=mejs.html5media.properties,y=0,g=h.length;y<g;y++)!function(t){var n=""+t.substring(0,1).toUpperCase()+t.substring(1);a["get"+n]=function(){if(null!==m){switch(t){case"currentTime":return u;case"duration":return p;case"volume":return s;case"muted":return 0===s;case"paused":return o;case"ended":return d;case"src":return m.getVideoUrl().then(function(e){f=e}),f;case"buffered":return{start:function(){return 0},end:function(){return l*p},length:1};case"readyState":return 4}return null}return null},a["set"+n]=function(n){if(null!==m)switch(t){case"src":var o="string"==typeof n?n:n[0].src,l=r.getVimeoId(o);m.loadVideo(l).then(function(){e.originalNode.autoplay&&m.play()}).catch(function(e){v(e,a)});break;case"currentTime":m.setCurrentTime(n).then(function(){u=n,setTimeout(function(){var t=mejs.Utils.createEvent("timeupdate",a);e.dispatchEvent(t)},50)}).catch(function(e){v(e,a)});break;case"volume":m.setVolume(n).then(function(){c=s=n,setTimeout(function(){var t=mejs.Utils.createEvent("volumechange",a);e.dispatchEvent(t)},50)}).catch(function(e){v(e,a)});break;case"loop":m.setLoop(n).catch(function(e){v(e,a)});break;case"muted":n?m.setVolume(0).then(function(){s=0,setTimeout(function(){var t=mejs.Utils.createEvent("volumechange",a);e.dispatchEvent(t)},50)}).catch(function(e){v(e,a)}):m.setVolume(c).then(function(){s=c,setTimeout(function(){var t=mejs.Utils.createEvent("volumechange",a);e.dispatchEvent(t)},50)}).catch(function(e){v(e,a)});break;case"readyState":var d=mejs.Utils.createEvent("canplay",a);e.dispatchEvent(d)}else i.push({type:"set",propName:t,value:n})}}(h[y]);for(var E=mejs.html5media.methods,U=0,j=E.length;U<j;U++)!function(e){a[e]=function(){if(null!==m)switch(e){case"play":return o=!1,m.play();case"pause":return o=!0,m.pause();case"load":return null}else i.push({type:"call",methodName:e})}}(E[U]);window["__ready__"+a.id]=function(t){if(e.vimeoPlayer=m=t,i.length)for(var n=0,r=i.length;n<r;n++){var c=i[n];if("set"===c.type){var f=c.propName,h=""+f.substring(0,1).toUpperCase()+f.substring(1);a["set"+h](c.value)}else"call"===c.type&&a[c.methodName]()}e.originalNode.muted&&(m.setVolume(0),s=0);for(var y=document.getElementById(a.id),g=void 0,E=0,U=(g=["mouseover","mouseout"]).length;E<U;E++)y.addEventListener(g[E],function(t){var n=mejs.Utils.createEvent(t.type,a);e.dispatchEvent(n)},!1);m.on("loaded",function(){m.getDuration().then(function(t){if((p=t)>0&&(l=p*t,e.originalNode.autoplay)){o=!1,d=!1;var n=mejs.Utils.createEvent("play",a);e.dispatchEvent(n)}}).catch(function(e){v(e,a)})}),m.on("progress",function(){m.getDuration().then(function(t){if((p=t)>0&&(l=p*t,e.originalNode.autoplay)){var n=mejs.Utils.createEvent("play",a);e.dispatchEvent(n);var r=mejs.Utils.createEvent("playing",a);e.dispatchEvent(r)}var i=mejs.Utils.createEvent("progress",a);e.dispatchEvent(i)}).catch(function(e){v(e,a)})}),m.on("timeupdate",function(){m.getCurrentTime().then(function(t){u=t;var n=mejs.Utils.createEvent("timeupdate",a);e.dispatchEvent(n)}).catch(function(e){v(e,a)})}),m.on("play",function(){o=!1,d=!1;var t=mejs.Utils.createEvent("play",a);e.dispatchEvent(t);var n=mejs.Utils.createEvent("playing",a);e.dispatchEvent(n)}),m.on("pause",function(){o=!0,d=!1;var t=mejs.Utils.createEvent("pause",a);e.dispatchEvent(t)}),m.on("ended",function(){o=!1,d=!0;var t=mejs.Utils.createEvent("ended",a);e.dispatchEvent(t)});for(var j=0,b=(g=["rendererready","loadedmetadata","loadeddata","canplay"]).length;j<b;j++){var w=mejs.Utils.createEvent(g[j],a);e.dispatchEvent(w)}};var b=e.originalNode.height,w=e.originalNode.width,N=document.createElement("iframe"),_="https://player.vimeo.com/video/"+r.getVimeoId(n[0].src),x=~n[0].src.indexOf("?")?"?"+n[0].src.slice(n[0].src.indexOf("?")+1):"";return x&&e.originalNode.autoplay&&-1===x.indexOf("autoplay")&&(x+="&autoplay=1"),x&&e.originalNode.loop&&-1===x.indexOf("loop")&&(x+="&loop=1"),N.setAttribute("id",a.id),N.setAttribute("width",w),N.setAttribute("height",b),N.setAttribute("frameBorder","0"),N.setAttribute("src",""+_+x),N.setAttribute("webkitallowfullscreen",""),N.setAttribute("mozallowfullscreen",""),N.setAttribute("allowfullscreen",""),e.originalNode.parentNode.insertBefore(N,e.originalNode),e.originalNode.style.display="none",r.load({iframe:N,id:a.id}),a.hide=function(){a.pause(),m&&(N.style.display="none")},a.setSize=function(e,t){N.setAttribute("width",e),N.setAttribute("height",t)},a.show=function(){m&&(N.style.display="")},a.destroy=function(){},a}};mejs.Utils.typeChecks.push(function(e){return/(\/\/player\.vimeo|vimeo\.com)/i.test(e)?"video/x-vimeo":null}),mejs.Renderers.add(i)},{}]},{},[1]);;
