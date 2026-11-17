import requests
import json
import os
from datetime import date
import time
import shutil
from collections import OrderedDict 

from bs4 import BeautifulSoup
from unidecode import unidecode
import Levenshtein
import pymongo





url = 'http://apl.utfpr.edu.br/extensao/certificados/listaPublica/'
url_search = 'http://apl.utfpr.edu.br/extensao/certificados/listaCertificadosPublicos/'


# Find only the events, not the certificates
# Only one campus and one year by time
def find_events(campus_code, year):
    events = []

    results_raw = requests.post(url, data = {'txtCampus': campus_code, 'txtAno': year}).text

    results = BeautifulSoup(results_raw, 'html.parser')

    campus_name = results.find(attrs={'name': 'txtCampus'}).find(attrs={'selected': True}).get_text()

    for one_event in results.find(attrs={"name": "txtEvento"}).find_all('option'):
        if one_event['value'] != '':
            events.append({
                'name': one_event.get_text(),
                'name_search': unidecode(one_event.get_text().upper()),
                'code': one_event['value'],
                'year': year,
                'campus': {'code': campus_code, 'name': campus_name},
                'qty_certs': 0,
                'certs': []
            })

    return events

def get_qty(one_event):

    url_id = 0
    count_certs = 0

    aux_event = one_event

    while True:

        results_raw = requests.post(url_search + str(url_id), data = {'txtEvento': one_event['code']}).text

        results = BeautifulSoup(results_raw, 'html.parser')

        all_tr = results.find(id='data_table').find_all('tr', id = True)

        if len(all_tr) == 0:
            break

        count_certs += len(all_tr)

        url_id += 15

    return count_certs

def get_owners(one_event):

    owners_ = {}
    
    url_id = 0

    aux_event = one_event

    while True:

        results_raw = requests.post(url_search + str(url_id), data = {'txtEvento': one_event['code']}).text

        results = BeautifulSoup(results_raw, 'html.parser')

        all_tr = results.find(id='data_table').find_all('tr', id = True)

        if len(all_tr) > 0:  

            for row in all_tr:

                try:
                    one_person = row.find_all('td')

                    aux_name = unidecode(one_person[0].get_text().upper())
                    aux_name = aux_name.rstrip('*.- \'" ')
                    aux_name = aux_name.lstrip('*.- \'" ')

                    aux_code = one_person[2].a.get('href').split('validar/')[1]
                    
                    while True:
                        if aux_name.find('  ') != -1:
                            aux_name = aux_name.replace('  ', ' ')
                        else:
                            break

                    aux_event['certs'].append({
                        'code': aux_code,
                        'owner': aux_name
                    })

                    if aux_name in owners_:

                        owners_[aux_name]['certs'].append({
                            'code': aux_code,
                            'year': one_event['year'],
                            'event_code': one_event['code'],
                            'event_name': one_event['name']
                        })

                    else:
                        owners_[aux_name] = {
                            'name': aux_name,
                            'certs': [{
                                'code': aux_code,
                                'year': one_event['year'],
                                'event_code': one_event['code'],
                                'event_name': one_event['name']
                            }]
                        }
                
                except:
                    print('error')

            url_id += 15

        else:
            break

    aux_event['qty_certs'] = len(aux_event['certs'])

    return aux_event, owners_

def init_db():
    myclient = pymongo.MongoClient("mongodb://localhost:27017/")
    mydb = myclient["certs"]

    return {'events': mydb["events"], 'owners': mydb["owners"]}


def main():

    """ 
    init_all

    update_one_year -> Every Day
    - campus_codes
    - year

    update_all_years -> Every Week
    - campus_codes

    verify_one_year -> Every Month
    - campus_codes
    - year

    verify_all_years -> Every trimester
    - campus_codes

    """
    
    #   CT -> 1   AP -> 2    CM -> 3    DV -> 4    FB -> 5    GP -> 6   LD -> 7
    #   MD -> 8   PB -> 9    PG -> 10   SH -> 11   TD -> 12   CP -> 13
    campus_code = '13'

    year = str(date.today().year)

    events = []
    owners = []

    #find events code
    #if events exists

    all_events = find_events(campus_code, year)

    my_db = init_db()

    for one_event in all_events:

        new_event, owners = get_owners(one_event)

        event_to_update = my_db['events'].find_one({'code': one_event['code']})

        if not event_to_update:
            ## Não existe o evento

            my_db['events'].insert_one(new_event)

            for one_owner in owners.values():
                owner_to_update = my_db['owners'].find_one({'name': one_owner['name']})
                
                if owner_to_update:
                    my_db['owners'].update_one({'name': owner_to_update['name']}, { "$set": { "certs": owner_to_update['certs'] + one_owner['certs'] } })

                else:
                    my_db['owners'].insert_one(one_owner)

        else:

            if event_to_update['qty_certs'] != new_event['qty_certs']:
                ## Significa que a qty de eventos aumentou
                #Loop nos owners

                #Atualiza totalmente o event
                #Encontra o diff entre os owners 

                for i in new_event['certs']:
                    if i not in event_to_update['certs']:

                        new_owner = owners[i['owner']]

                        owner_to_update = my_db['owners'].find_one({'name': new_owner['name']})
        
                        if owner_to_update:
                            my_db['owners'].update_one({'name': owner_to_update['name']}, { "$set": { "certs": owner_to_update['certs'] + new_owner['certs'] } })

                        else:
                            my_db['owners'].insert_one(new_owner)

                my_db['events'].update_one({'code': new_event['code']}, { "$set": { "certs": new_event['certs'], "qty_certs": new_event['qty_certs'] } })


        
    #events = get_qty_certs(events)
    #events = events_diff(events, year)



###############
    #events = find_only_events(campus_code, year)
    #events = get_qty_certs(events)
    #events = events_diff(events, year)

############################################################
############################################################
############################################################
############################################################

if __name__ == '__main__':
    main()