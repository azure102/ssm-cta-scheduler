const axios = require('axios');
const qs = require('qs'); // For form-urlencoded POST data
const fs = require('fs');
const path = require('path');
const { DateTime } = require('luxon');

const API_KEY = 'RR2tqFz3v8luyzBlYWl1BEsLjWbKvede';

const SSMtemplate = fs.readFileSync('SSM_Comms_Template_Container.txt', 'utf8');


function getNextSunday() {
  const today = new Date();
  const nextSunday = new Date(today);
  const dayOfWeek = today.getDay();
  const daysUntilNextSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
  nextSunday.setDate(dayOfWeek + daysUntilNextSunday); // fixed logic here
  nextSunday.setHours(0, 0, 0, 0);
  return nextSunday.toISOString().split('T')[0]; // Format: YYYY-MM-DD
}

function getNextSundaySydneyTime() {
  const now = DateTime.now().setZone('Australia/Sydney');
  const daysUntilSunday = (7 - now.weekday) % 7 || 7;
  const nextSunday = now.plus({ days: daysUntilSunday }).startOf('day');
  return nextSunday.toISODate(); // e.g. "2025-04-06"
}

function addDays(dateStr, days) {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

async function getSundayServiceID() {
  const targetDate = getNextSundaySydneyTime();
  const endDate = addDays(targetDate, 1);

  console.log(`🕒 GitHub now (UTC): ${new Date().toISOString()}`);
  console.log(`🕐 Sydney now: ${DateTime.now().setZone('Australia/Sydney').toISO()}`);
  console.log(`🎯 Target Sunday (Sydney): ${targetDate}`);

  console.log(`Requesting services between: ${targetDate} and ${endDate}`);

  try {
    const response = await axios.post(
      'https://api.elvanto.com/v1/services/getAll.json',
      qs.stringify({
        start: targetDate,
        end: endDate
      }),
      {
        auth: {
          username: API_KEY,
          password: 'x'
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        }
      }
    );

  const rawService = response.data.services?.service;

if (!rawService) {
  console.log('No service found for that date.');
  return;
}

const service = Array.isArray(rawService) ? rawService[0] : rawService;

console.log('Service ID:', service.id);

return service.id;


  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
}


async function getVolunteersForService(serviceId) {
  if (!serviceId) {
    console.log('No service ID provided.');
    return;
  }

  try {
    const response = await axios.post(
      'https://api.elvanto.com/v1/services/getInfo.json',
      qs.stringify({
        id: serviceId,
        'fields[0]': 'volunteers'
      }),
      {
        auth: {
          username: API_KEY,
          password: 'x'
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        }
      }
    );


    const volunteers = response.data.service[0].volunteers.plan[0].positions.position;

    //console.log('📦 Full Volunteer response:', JSON.stringify(volunteers, null, 2)); - Test LOG

    if (!volunteers || volunteers.length === 0) {
      console.log('No volunteers rostered for this service.');
      return;
    }

    console.log(`Volunteers for service ${serviceId}:`);
    volunteers.forEach(v => {
      if(v.volunteers != ""){
        console.log(`• ${v.volunteers.volunteer[0].person.firstname} ${v.volunteers.volunteer[0].person.lastname} – ${v.sub_department_name} (${v.position_name})`);
      }

    });

    return volunteers;

  } catch (err) {
    console.error('Error retrieving volunteers:', err.response?.data || err.message);
  }
}

function mapVolunteersToRoles(volunteers, nextSundayDate) {
  const roles = {
    serviceDate: 'No Volunteer Set in Elvanto',
    worshipLeader: 'No Volunteer Set in Elvanto',
    singerOne: 'No Volunteer Set in Elvanto',
    singerTwo: 'Not Available',
    acousticGuitar: 'No Volunteer Set in Elvanto',
    electricGuitar: 'No Volunteer Set in Elvanto',
    bassist: 'No Volunteer Set in Elvanto',
    drummer: 'No Volunteer Set in Elvanto',
    keyboardist: 'No Volunteer Set in Elvanto',
    soundEngineer: 'No Volunteer Set in Elvanto',
    sundayServiceManager: 'No Volunteer Set in Elvanto',
    musicDirector: 'No Volunteer Set in Elvanto',
    offeringSpeaker: 'No Volunteer Set in Elvanto',
    multimediaOperator: 'No Volunteer Set in Elvanto',
    livestreamOperator: 'No Volunteer Set in Elvanto',
    preacher: 'No Volunteer Set in Elvanto'
  };

  console.log('📦 Full Volunteer input on "mapVolunteer" :', JSON.stringify(volunteers, null, 2)); // - Test LOG

  volunteers.forEach(vol => {
    if(vol.volunteers != ""){
      const fullName = `${vol.volunteers.volunteer[0].person.firstname} ${vol.volunteers.volunteer[0].person.lastname}`;
      
      if(vol.position_name === 'Worship Leader') roles.worshipLeader = fullName; //SERVICE
      
      if(vol.position_name === 'Singer'){ //SPECIAL CASE singer 1 and singer 2 ; logic to be enhanced in the future.
        roles.singerOne = fullName;
      }
      if(vol.position_name === 'Singer' && roles.singerOne != "" && vol.volunteers.volunteer[1]){
        const fullNameTwo = `${vol.volunteers.volunteer[1].person.firstname} ${vol.volunteers.volunteer[1].person.lastname}`;
        roles.singerTwo = fullNameTwo;
      }

      if(vol.position_name === 'Acoustic Guitar') roles.acousticGuitar = fullName;
      else if(vol.position_name === 'Electric Guitar') roles.electricGuitar = fullName;
      else if(vol.position_name === 'Bass Guitar') roles.bassGuitar = fullName;
      else if(vol.position_name === 'Drum') roles.drummer = fullName;
      else if(vol.position_name === 'Keyboard') roles.keyboardist = fullName;
      else if(vol.position_name === 'Sound Engineer') roles.soundEngineer = fullName;
      else if(vol.position_name === 'SSM In Charge') roles.sundayServiceManager = fullName;
      else if(vol.position_name === 'Music Director (MD)') roles.musicDirector = fullName; 
      else if(vol.position_name === 'Multimedia Operator') roles.multimediaOperator = fullName; //MULTIMEDIA
      else if(vol.position_name === 'Livestream Operator') roles.livestreamOperator = fullName;
      else if(vol.position_name === 'Offering Speaker') roles.offeringSpeaker = fullName; //DISCIPLESHIP
      else if(vol.position_name === 'Preacher') roles.preacher = fullName; //PREACHER
    }
  });

  roles.serviceDate = nextSundayDate || "Upcoming Sunday";

  console.log("Complete Roles Object: " + JSON.stringify(roles, null, 2));

  return roles;
}

function exportVolunteersToTemplateFile(roleMap) {
  let filled = SSMtemplate;

  Object.keys(roleMap).forEach(key => {
    const placeholder = `{{${key}}}`;
    filled = filled.replace(placeholder, roleMap[key] || 'TBA');
  });

  fs.writeFileSync('SSM_Comms_Template_FINAL.txt', filled, 'utf8');
  console.log('SSM_Comms_Template_FINAL.txt created with role-based mapping');
}



async function main() {
  const serviceId = await getSundayServiceID();
  if (!serviceId) {
    console.log('❌ Could not get service ID.');
    return;
  }

  const volunteers = await getVolunteersForService(serviceId);
  if (!volunteers) {
    console.log('❌ Could not get volunteers.');
    return;
  }

  const roles = mapVolunteersToRoles(volunteers, getNextSundaySydneyTime());
  exportVolunteersToTemplateFile(roles); // or any further processing
}

main();