Faith Do, git CS333: Professor Jessica Hullman<br>
Interactive visualization of a dataset using D3 library<br>
Dataset in the 'data/' folder was downloaded from Human Mortality Dataset (HMD). I do not claim ownership over this dataset only the code to create a visualization in this repository.<br>

# Instructions on how to run visualization locally
Ensure you have Node.js http server installed globally npm: install -g http-server
cd into the folder you downloaded this project into
Start the server with: http-server -p 8000
Open 'http://localhost:8000/' in your browser


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

## 3. Final writeup checklist
Description of storyboards<br>
Brief description of final visualization application<br>
Explanation of changes between storyboard and final result<br>
Commentary on implementation process<br>
Bundled code submission in working order<br>

