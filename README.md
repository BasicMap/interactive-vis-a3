Faith Do, CS333: Professor Jessica Hullman<br>
Interactive visualization of a dataset using D3 library<br>
Dataset in the 'data/' folder was downloaded from Human Mortality Dataset (HMD). I do not claim ownership over this dataset only the code to create a visualization in this repository.<br>

# Instructions on how to run visualization locally
Ensure you have Node.js http server installed globally npm: install -g http-server<br>
cd into the folder you downloaded this project into<br>
Start the server with: http-server -p 8000<br>
Open 'http://localhost:8000/' in your browser<br>
Note: DO NOT click on either link posted in your terminal, it will take you to a different cached version of the visualization that is not reflective of the most recently committed code.


## 1. Design and Storyboarding
The dataset I chose to work with is from mortality.org and looks into various human mortality statistics. The data domain is national-level annual counts of live births from the Human Mortality Dataset (HMD). There are datapoints for a given year for all countries, separated by sex (male or female). I think this dataset will be good for an interactive visualization because of the temporal (over time), comparative (between countries), and multifaceted trends (male vs. female, total births, analyze different time windows per country such as post-wartime) that we can observe. <br>
To acheive this, I will use different methods. Dynamic queries will be of most use to me due to the demographic nature of the dataset. A country selector and timeline scale will be the main examples of this method. In this way, users can adjust which country they want to view, such as South Africa, and what time period they want to view for that country, for example the 1948-1990s when the Apartheid was occurring. The dynamic query allows you to select for these reasons, it might even be interesting to look towards countries near South Africa during the same time period as well to see if there is a trickle-in effect. This also plays a little bit into view manipulation where the user can zoom into the timeline to specify the period they want to look at.

### **Questions to answer:**
 - How have birth rates changed over time in a specific country?
 - How do birth rates compare between different countries?
 - Are there any trends with male vs. female birth rates over time?
 - Do any specific historic events appear clear based on the trends observed in the data? 

### **Storyboarding**
Screen 1: Initial Overview<br>
    Top control bar with country selector, year range slider, series/scale toggle.<br>
Screen 2: Temporal View<br>
    User can select a single country and/or choose a time period.<br>
Screen 3: Comparative View<br>
    User can select more than one country.<br>
Screen 4: Multifaceted View<br>
    User can filter by gender per any time period for any country.<br>

## 2. Implementation
View index.html, script.js, and style.css for implementation details. <br>

## 3. Final writeup 
My final interactive visualization allows you to select which dataset you would like to view for certain statistics including: birth/death counts, birth/death rates, and population size. Demographics such as gender were also taken for these counts. I pivoted from my storyboard design a little bit to accomodate the different ways the datasets were outlined. As Prof. Hullman suggested during my progress presentation in class, it was more helpful to display each dataset as a separate interaction visual. The brushing for the year range is the main dyanmic interaction for the assignment, the default for it highlights the entire range but I promise if you click around it does work! <br> 
For my comparative view from my storyboard, I included a bar chart below the line graph to display the average statistics over the selected time range to make it easier to compare. The mapping from positive marks a clean visual for the user to see (it is especially helpful if you use the United States against pretty much any other country). Below both these graphs are the summary statistics which gives the user the exact numbers displayed in the bar chart above with the average, minimum, and maximum. <br>
Scrubbing from the datsets were a little difficult, but mostly managable. Some countries had data from the 1700s, but most didn't so I hard-coded the minimum to be 1900 since that was the year that most countries started having data in all the datasets I chose to visualize. The line graph looks more full and when comparing countries to each other is it easier to see the gaps between the lines and the amount of space between the bars. <br>
One thing that is unclear that I did not have enough time to brush up on is the "Metric" selection. For death/birth *counts*, demographic data for gender was taken, and by selecting either option the summary statistics will change to reflect the data in the datasets. The shift in the line and bar charts sometimes seems negligible, but when you check the table it is clear that the desired data is being shown.<br>
I worked on this probably an hour a day since the progress presentations, plus a few more on the day it was due. So give or take 15 hours? 

## 4. Checklist
Description of storyboards: ✅<br>
Brief description of final visualization application: <br>
Explanation of changes between storyboard and final result<br>
Commentary on implementation process<br>
Bundled code submission in working order<br>

