def posun(slovo, index):
    delka_slova = len(slovo)
    vysledek = slovo[delka_slova - index:delka_slova] + \
        slovo[0:delka_slova - index]

    return vysledek


print(posun("xDDDD", 3))
