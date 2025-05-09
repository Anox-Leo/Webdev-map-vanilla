import time
from lxml import etree
from svgpathtools import parse_path
from collections import defaultdict

# filepath: /Users/leojj/Desktop/A2-IMT/Webdev/WEBDEV-MAP/map.svg
file_path = "/Users/leojj/Desktop/A2-IMT/Webdev/WEBDEV-MAP/map.svg"


def sort_group_paths(indices, path_data):
    ordered = []
    remaining = indices.copy()
    starts = {path_data[idx]['start'] for idx in remaining}
    ends = {path_data[idx]['end'] for idx in remaining}

    # Trouver le point de départ principal
    start_points = [idx for idx in remaining 
                   if path_data[idx]['start'] not in ends]
    
    current_idx = start_points[0] if start_points else remaining[0]
    ordered.append(current_idx)
    remaining.remove(current_idx)

    while remaining:
        current_end = path_data[current_idx]['end']
        # Trouver le prochain segment connecté
        next_idx = next((idx for idx in remaining 
                        if path_data[idx]['start'] == current_end), None)
        
        if next_idx is None:  # Fin de la chaîne
            ordered.extend(remaining)
            break
            
        ordered.append(next_idx)
        remaining.remove(next_idx)
        current_idx = next_idx

    return ordered

def group_and_order_paths(svg_file, output_file, precision=3):
    tree = etree.parse(svg_file)
    ns = {'svg': 'http://www.w3.org/2000/svg'}
    paths = tree.xpath('//svg:path', namespaces=ns)
    
    # Étape 1 : Extraction des points
    path_data = []
    for idx, path in enumerate(paths):
        d = path.get('d')
        parsed = parse_path(d)
        start = parsed[0].start
        end = parsed[-1].end
        path_data.append({
            'element': path,
            'start': complex(round(start.real, precision), round(start.imag, precision)),
            'end': complex(round(end.real, precision), round(end.imag, precision))
        })

    # Étape 2 : Regroupement
    groups = defaultdict(list)
    point_to_group = {}
    current_group = 0

    for idx, data in enumerate(path_data):
        connection_points = [data['start'], data['end']]
        connected_groups = {point_to_group.get(p) for p in connection_points if p in point_to_group}
        
        if not connected_groups:  # Nouveau groupe
            group_id = current_group
            current_group += 1
        else:  # Fusion des groupes connectés
            group_id = min(g for g in connected_groups if g is not None)
        
        # Mise à jour du groupe pour tous les points connectés
        for p in connection_points:
            point_to_group[p] = group_id
        
        groups[group_id].append(idx)

    # Étape 3 : Ordonnancement et attribution des classes
    for group_id, indices in groups.items():
        ordered_indices = sort_group_paths(indices, path_data)
        
        for order, idx in enumerate(ordered_indices, 1):
            path = path_data[idx]['element']
            new_class = f"R-{group_id}-{order}"
            existing_class = path.get('class', '')
            path.set('class', f"{existing_class} {new_class}".strip())

    tree.write(output_file, encoding='UTF-8', xml_declaration=True)

# Exemple d'utilisation
group_and_order_paths('./test.svg', 'output_ordered.svg')

def reorder_paths_by_class(svg_content):
    tree = etree.parse(svg_content)
    ns = {'svg': 'http://www.w3.org/2000/svg'}
    paths = tree.xpath('//svg:path', namespaces=ns)
    paths_sorted = sorted(paths, key=lambda p: p.get('class'))
    
    new_root = etree.Element(tree.tag, nsmap=tree.nsmap)
    for elem in tree:
        if elem.tag != '{http://www.w3.org/2000/svg}path':
            new_root.append(elem)
    for path in paths_sorted:
        new_root.append(path)
    return etree.tostring(new_root, pretty_print=True, encoding='unicode')

time.sleep(1)
reorder_paths_by_class('./output_ordered.svg')
