Scraper
=======

A Google Chrome extension for getting data out of web pages and into spreadsheets.

what i have done is add some new feature.

this extension can do these things:

1. Inject javascript to the target page, which can simulate any normal user operation like click to show some hidden information in that page.
2. you can set a list of url and the capture patterns, and you can set how many pages you wanna to scrape for each url with the related pattern(if the target page contains a next page of course.)
3. this extension treate image and text, it depends on your pattern. 
4. this extension concern about iframe, if there is a iframe, you need to define the xpath of iframe and the xpath for the element in iframe.
5. the export to google doc not work anymore, anyone wanna to complete it , you are wellcome.
6. all the data are send to your server and not saved in local machine.

Example
-----
  You can try to visit this site:[www.sppop.fr](www.spoop.fr) to see the result, but i can not show you the server side script, 99% of the record is from the scraper.
  
Usage
-----


Highlight a part of the page that is similar to what you want to scrape. Right-click and select the "Scrape selected..." item. The scraper window will appear, showing you the initial results. You can export the table to by pressing the "Export to Google Docs..." button or use the left-hand pane to further refine or customize your scraping.

The "Selector" section lets you change which page elements are scraped. You can specify the query as either a [jQuery selector](http://api.jquery.com/category/selectors/), or in [XPath](http://www.w3schools.com/XPath/xpath_intro.asp).

You may also customize the columns of the table in the "Columns" section. These must be specified in XPath. You can specify names for columns if you would like.

Selecting the "Exclude empty results" filter will prevent any matches that contain no column values from appearing in the table.

After making any customizations, you must press the "Scrape" button to update the table of results.

New usage
------
The right click will only show you  how to get the xpath of an element, but the most important is you setup a list of xpath you wanna to capture. You can setup a xpath list file, and then send them back with json. This extension will consecutively work on this list till nothing rest. 

Also, you can set up repeat interval to let the extension scrape that list again and again and again.


Download
--------
The original one can be found here.

Download the extension from [http://chrome.google.com/extensions/detail/mbigbapnjcgaffohmbkdlecaccepngjd](http://chrome.google.com/extensions/detail/mbigbapnjcgaffohmbkdlecaccepngjd).

Get the sources from [https://github.com/mnmldave/scraper](https://github.com/mnmldave/scraper).

Building
--------

You don't need to 'build' this extension per se. To test it out, you first 
need to navigate to `chrome://extensions` from Google Chrome then expand "Developer Mode". Click the "Load unpacked extension..." button and point it to the `src` directory.

Learn more about plugin development from the [Google Chrome Extensions](http://code.google.com/chrome/extensions/index.html "Google Chrome Extensions - Google Code") page.

A `Rakefile` is included for compiling the Google Chrome extension into a
zip file. It also does javascript and css minification.

License
-------

Scraper is open-sourced under a BSD license which you can find in `LICENSE.txt`.

Credits
-------




-----------------------------------------------------------------------------
Copyright (c) 2013 TAN Hao (ferdinandfly@gmail.com)